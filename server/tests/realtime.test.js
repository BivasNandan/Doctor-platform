import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { startTestApp } from "./helpers.js";
import { fails, makePeople, ok } from "./people.js";

let ctx;
let people;
let clinic;

before(async () => {
  ctx = await startTestApp();
  people = makePeople(ctx);
  ({ clinic } = await people.createCatalog());
});
after(() => ctx.stop());
beforeEach(() => ctx.resetRateLimits());

/** Opens the event stream like a browser tab would and collects what arrives. */
async function listen(person) {
  const controller = new AbortController();
  const cookie = Object.entries(person.client.cookies())
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
  const response = await fetch(`${ctx.baseUrl}/events`, {
    headers: { cookie, accept: "text/event-stream" },
    signal: controller.signal,
  });
  const events = [];
  let text = "";
  const waiting = [];
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  (async () => {
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        let end;
        while ((end = text.indexOf("\n\n")) >= 0) {
          const frame = text.slice(0, end);
          text = text.slice(end + 2);
          const type = /^event: (.+)$/m.exec(frame)?.[1];
          const data = /^data: (.+)$/m.exec(frame)?.[1];
          if (type) events.push({ type, ...JSON.parse(data) });
          waiting.splice(0).forEach((resolve) => resolve());
        }
      }
    } catch {
      // aborted by close()
    }
  })();

  const stream = {
    response,
    events,
    /** Resolves with the first event matching `predicate`, or rejects after 5 s. */
    async next(predicate) {
      const deadline = Date.now() + 5000;
      for (;;) {
        const found = events.find(predicate);
        if (found) return found;
        if (Date.now() > deadline) throw new Error(`no matching event; saw ${JSON.stringify(events)}`);
        await new Promise((resolve) => {
          waiting.push(resolve);
          setTimeout(resolve, 100);
        });
      }
    },
    close: () => controller.abort(),
  };
  await stream.next((event) => event.type === "ready");
  return stream;
}

async function pair() {
  const doctor = await people.createDoctor(clinic);
  const patient = await people.createPatient();
  const { conversation } = await people.createAppointment(doctor, patient, clinic);
  return { doctor, patient, conversation };
}

describe("the event stream", () => {
  it("opens as text/event-stream and says it is ready", async () => {
    const patient = await people.createPatient();
    const stream = await listen(patient);
    try {
      assert.match(stream.response.headers.get("content-type"), /^text\/event-stream/);
      assert.match(stream.response.headers.get("cache-control"), /no-cache/);
      assert.equal(stream.response.headers.get("x-accel-buffering"), "no");
    } finally {
      stream.close();
    }
  });

  it("needs a signed-in person", async () => {
    fails(await ctx.client().get("/events"), 401, "UNAUTHENTICATED");
  });

  it("registers and forgets connections, and caps them per person", async () => {
    const { connectionCount } = await import("../src/services/realtime.js");
    const patient = await people.createPatient();
    const streams = [];
    for (let index = 0; index < 7; index += 1) streams.push(await listen(patient));
    assert.equal(connectionCount(patient.id), 5);
    streams.forEach((stream) => stream.close());
    for (let attempt = 0; attempt < 50 && connectionCount(patient.id) > 0; attempt += 1)
      await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(connectionCount(patient.id), 0);
  });
});

describe("pushed events", () => {
  it("delivers a new message to the other person at once, and to the sender's other tabs", async () => {
    const { doctor, patient, conversation } = await pair();
    const receiver = await listen(doctor);
    const senderTab = await listen(patient);
    const bystander = await listen(await people.createPatient());
    try {
      ok(
        await patient.client.post(`/conversations/${conversation.id}/messages`, { body: "Hello doctor" }),
        201,
      );
      const sentAt = Date.now(); // the API has answered; the other person's page must hear about it right away
      const event = await receiver.next((item) => item.type === "message");
      assert.equal(event.conversationId, conversation.id);
      // the event carries the message itself, from the receiver's point of view
      assert.equal(event.message.body, "Hello doctor");
      assert.equal(event.message.isMine, false);
      assert.equal(event.message.sender, "patient");
      assert.ok(Date.now() - sentAt < 1000, "delivered well under the old polling delay");
      const echo = await senderTab.next((item) => item.type === "message");
      assert.equal(echo.message.isMine, true); // the sender's other tab sees it as their own
      await new Promise((resolve) => setTimeout(resolve, 300));
      assert.equal(bystander.events.filter((item) => item.type === "message").length, 0);
    } finally {
      [receiver, senderTab, bystander].forEach((stream) => stream.close());
    }
  });

  it("tells the sender when the other person has read the conversation", async () => {
    const { doctor, patient, conversation } = await pair();
    ok(
      await patient.client.post(`/conversations/${conversation.id}/messages`, { body: "Are you there?" }),
      201,
    );
    const sender = await listen(patient);
    try {
      ok(await doctor.client.get(`/conversations/${conversation.id}/messages`)); // opening it marks it read
      const event = await sender.next((item) => item.type === "read");
      assert.equal(event.conversationId, conversation.id);
      assert.equal(event.readerId, doctor.userId); // so the page knows whose messages were read
      assert.equal(event.readerRole, "doctor");
    } finally {
      sender.close();
    }
  });

  it("tells a person when they get a notification", async () => {
    const doctor = await people.createDoctor(clinic);
    const patient = await people.createPatient();
    await people.createAppointment(doctor, patient, clinic, { status: "completed" });
    const stream = await listen(doctor);
    try {
      ok(await patient.client.post(`/doctors/${doctor.id}/reviews`, { rating: 5 }), 201);
      await stream.next((item) => item.type === "notification");
    } finally {
      stream.close();
    }
  });

  it("tells both people when a new conversation opens after an appointment is accepted", async () => {
    const doctor = await people.createDoctor(clinic);
    const patient = await people.createPatient();
    const { appointment } = await people.createAppointment(doctor, patient, clinic, {
      status: "pending",
      withConversation: false,
    });
    const [forDoctor, forPatient] = [await listen(doctor), await listen(patient)];
    try {
      ok(await doctor.client.patch(`/doctor/appointments/${appointment.id}`, { status: "accepted" }));
      await forDoctor.next((item) => item.type === "conversation");
      await forPatient.next((item) => item.type === "conversation");
    } finally {
      forDoctor.close();
      forPatient.close();
    }
  });
});

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { startTestApp } from "./helpers.js";
import { fails, makePeople, ok } from "./people.js";

const INBOX = "webcarewell@test.local";
let ctx;
let people;
let admin;

before(async () => {
  process.env.SUPPORT_EMAIL = INBOX; // read once when the app is imported
  ctx = await startTestApp();
  people = makePeople(ctx);
  admin = await people.createAdmin();
});
after(() => ctx.stop());
beforeEach(() => {
  ctx.resetRateLimits();
  ctx.outbox.length = 0;
});

const toInbox = () => ctx.outbox.filter((mail) => mail.to === INBOX);
// The email is sent in the background, so give it a moment instead of assuming it is instant.
async function mailArrives() {
  for (let attempt = 0; attempt < 40 && !toInbox().length; attempt += 1)
    await new Promise((resolve) => setTimeout(resolve, 25));
  return toInbox();
}

describe("help-page messages reach the Carewell mailbox", () => {
  it("forwards a visitor's message, and replying goes to the visitor", async () => {
    const created = ok(
      await ctx.client().post("/support-requests", {
        message: "My booking confirmation never arrived, please check.",
        email: "Visitor@Example.test",
      }),
      201,
    );
    const [mail] = await mailArrives();
    assert.equal(toInbox().length, 1);
    assert.equal(mail.to, INBOX);
    assert.equal(mail.replyTo, "visitor@example.test");
    assert.match(mail.subject, /^\[Carewell support\] My booking confirmation never arrived/);
    assert.match(mail.text, /From: a visitor/);
    assert.match(mail.text, /Email: visitor@example\.test/);
    assert.match(mail.text, /My booking confirmation never arrived, please check\./);
    assert.ok(mail.text.includes(created.id));
  });

  it("says who a signed-in patient is and uses their account email", async () => {
    const patient = await people.createPatient();
    ok(await patient.client.post("/support-requests", { message: "I cannot change my phone number" }), 201);
    const [mail] = await mailArrives();
    assert.equal(mail.replyTo, patient.email);
    assert.ok(mail.text.includes(`${patient.name} (signed-in patient)`));
  });

  it("still forwards a message that has no reply address, and says so", async () => {
    ok(
      await ctx
        .client()
        .post("/support-requests", { message: "Anonymous but important feedback", email: "" }),
      201,
    );
    const [mail] = await mailArrives();
    assert.equal(mail.replyTo, undefined);
    assert.match(mail.text, /not provided/);
  });

  it("keeps the message in the admin inbox and notifies administrators as before", async () => {
    ok(await ctx.client().post("/support-requests", { message: "Please call me about my appointment" }), 201);
    await mailArrives();
    const rows = ok(await admin.client.get("/admin/support-requests"));
    assert.ok(rows.some((row) => row.message === "Please call me about my appointment"));
    const notices = ok(await admin.client.get("/notifications")).items;
    assert.ok(notices.some((item) => item.title === "New support request" && item.link === "/admin/support"));
  });

  it("sends nothing for invalid or rate-limited messages", async () => {
    fails(await ctx.client().post("/support-requests", { message: "short" }), 422, "VALIDATION_FAILED");
    fails(
      await ctx
        .client()
        .post("/support-requests", { message: "A long enough message", email: "not-an-email" }),
      422,
      "VALIDATION_FAILED",
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(toInbox().length, 0);
    ctx.resetRateLimits(); // invalid submissions count towards the limit too

    for (let index = 0; index < 5; index += 1)
      ok(
        await ctx.client().post("/support-requests", { message: `Message number ${index} for the team` }),
        201,
      );
    fails(
      await ctx.client().post("/support-requests", { message: "One message too many" }),
      429,
      "RATE_LIMITED",
    );
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.equal(toInbox().length, 5);
  });
});

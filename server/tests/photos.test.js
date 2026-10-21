import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { startTestApp } from "./helpers.js";
import { fails, makePeople, ok } from "./people.js";
import {
  cleanupStorage,
  download,
  jpegBytes,
  pdfBytes,
  pngBytes,
  upload,
  useTestStoragePrefix,
  webpBytes,
} from "./uploads.js";

let ctx;
let people;
let clinic;
let admin;

before(async () => {
  useTestStoragePrefix();
  ctx = await startTestApp();
  people = makePeople(ctx);
  ({ clinic } = await people.createCatalog());
  admin = await people.createAdmin();
});
after(async () => {
  await cleanupStorage(ctx);
  await ctx.stop();
});
beforeEach(() => ctx.resetRateLimits());

const setPhoto = (person, options) => upload(ctx, person.client, "/me/photo", options);
const png = { name: "me.png", type: "image/png", bytes: pngBytes() };

describe("setting a profile photo", () => {
  it("accepts JPEG, PNG and WebP and shows the link on the account", async () => {
    const patient = await people.createPatient();
    assert.equal(ok(await patient.client.get("/auth/me")).user.photoUrl, undefined);

    for (const sample of [
      { name: "a.jpg", type: "image/jpeg", bytes: jpegBytes() },
      png,
      { name: "c.webp", type: "image/webp", bytes: webpBytes() },
    ]) {
      const { user } = ok(await setPhoto(patient, sample));
      assert.match(user.photoUrl, new RegExp(`^/api/v1/photos/users/${patient.id}\\?v=\\d+$`));
    }
    assert.match(ok(await patient.client.get("/auth/me")).user.photoUrl, /photos\/users/);
  });

  it("serves the picture back to its owner", async () => {
    const patient = await people.createPatient();
    ok(await setPhoto(patient, png));
    const file = await download(ctx, patient.client, `/photos/users/${patient.id}`);
    assert.equal(file.status, 200);
    assert.equal(file.type, "image/png");
    assert.deepEqual(file.bytes, pngBytes());
    assert.match(file.cacheControl, /private/);
  });

  it("replaces the previous picture and removes the old file", async () => {
    const patient = await people.createPatient();
    ok(await setPhoto(patient, png));
    const first = (await ctx.prisma.user.findUnique({ where: { id: patient.id } })).photoKey;
    ok(await setPhoto(patient, { name: "b.jpg", type: "image/jpeg", bytes: jpegBytes() }));
    const second = (await ctx.prisma.user.findUnique({ where: { id: patient.id } })).photoKey;
    assert.notEqual(first, second);
    const { getObject } = await import("../src/services/storage.js");
    await assert.rejects(getObject(first));
    assert.ok(await getObject(second));
  });

  it("rejects files that are not small, genuine images", async () => {
    const patient = await people.createPatient();
    fails(
      await setPhoto(patient, { name: "cv.pdf", type: "application/pdf", bytes: pdfBytes() }),
      422,
      "UNSUPPORTED_FILE",
    );
    fails(
      await setPhoto(patient, { name: "x.gif", type: "image/gif", bytes: Buffer.from("GIF89a-----") }),
      422,
      "UNSUPPORTED_FILE",
    );
    // claims to be a PNG but its content is something else
    fails(
      await setPhoto(patient, { name: "fake.png", type: "image/png", bytes: pdfBytes() }),
      422,
      "UNSUPPORTED_FILE",
    );
    const big = Buffer.concat([pngBytes(), Buffer.alloc(2 * 1024 * 1024, 1)]);
    fails(await setPhoto(patient, { name: "big.png", type: "image/png", bytes: big }), 413, "FILE_TOO_LARGE");
    assert.equal((await ctx.prisma.user.findUnique({ where: { id: patient.id } })).photoKey, null);
  });

  it("needs a signed-in person and a file", async () => {
    fails(await upload(ctx, ctx.client(), "/me/photo", png), 401, "UNAUTHENTICATED");
    const patient = await people.createPatient();
    const response = await fetch(`${ctx.baseUrl}/me/photo`, {
      method: "POST",
      headers: {
        cookie: Object.entries(patient.client.cookies())
          .map(([key, value]) => `${key}=${value}`)
          .join("; "),
      },
      body: new FormData(),
    });
    assert.equal(response.status, 422);
  });

  it("works for doctors and puts the photo on their public profile and in the list", async () => {
    const doctor = await people.createDoctor(clinic);
    ok(await setPhoto(doctor, png));
    const profile = ok(await ctx.client().get(`/doctors/${doctor.id}`));
    assert.match(profile.image, new RegExp(`/photos/users/${doctor.userId}\\?v=`));
    const listed = ok(await ctx.client().get("/doctors")).find((item) => item.id === doctor.id);
    assert.equal(listed.image, profile.image);
  });
});

describe("removing a profile photo", () => {
  it("deletes the file and falls back to no photo", async () => {
    const patient = await people.createPatient();
    ok(await setPhoto(patient, png));
    const key = (await ctx.prisma.user.findUnique({ where: { id: patient.id } })).photoKey;
    const { user } = ok(await patient.client.delete("/me/photo"));
    assert.equal(user.photoUrl, undefined);
    const { getObject } = await import("../src/services/storage.js");
    await assert.rejects(getObject(key));
    fails(await patient.client.get(`/photos/users/${patient.id}`), 404, "NOT_FOUND");
    ok(await patient.client.delete("/me/photo")); // nothing to remove is fine
    fails(await ctx.client().delete("/me/photo"), 401, "UNAUTHENTICATED");
  });
});

describe("who may look at a photo", () => {
  it("shows a published doctor's photo to everyone, cached for a day", async () => {
    const doctor = await people.createDoctor(clinic);
    ok(await setPhoto(doctor, png));
    const file = await download(ctx, ctx.client(), `/photos/users/${doctor.userId}`);
    assert.equal(file.status, 200);
    assert.match(file.cacheControl, /public, max-age=86400/);
  });

  it("keeps an unpublished doctor's photo private", async () => {
    const doctor = await people.createDoctor(clinic, { published: false });
    ok(await setPhoto(doctor, png));
    assert.equal((await download(ctx, ctx.client(), `/photos/users/${doctor.userId}`)).status, 404);
    assert.equal((await download(ctx, doctor.client, `/photos/users/${doctor.userId}`)).status, 200);
    assert.equal((await download(ctx, admin.client, `/photos/users/${doctor.userId}`)).status, 200);
  });

  it("shows a patient's photo only to them, an administrator and doctors they have dealt with", async () => {
    const doctor = await people.createDoctor(clinic);
    const unrelated = await people.createDoctor(clinic);
    const patient = await people.createPatient();
    const stranger = await people.createPatient();
    await people.createAppointment(doctor, patient, clinic);
    ok(await setPhoto(patient, png));

    const path = `/photos/users/${patient.id}`;
    for (const viewer of [patient, admin, doctor])
      assert.equal((await download(ctx, viewer.client, path)).status, 200);
    for (const viewer of [{ client: ctx.client() }, stranger, unrelated])
      assert.equal((await download(ctx, viewer.client, path)).status, 404);
  });

  it("answers 404 for people without a photo and for malformed ids", async () => {
    const patient = await people.createPatient();
    fails(await patient.client.get(`/photos/users/${patient.id}`), 404, "NOT_FOUND");
    fails(await patient.client.get("/photos/users/not-an-id"), 404, "NOT_FOUND");
  });

  it("appears next to people in conversations", async () => {
    const doctor = await people.createDoctor(clinic);
    const patient = await people.createPatient();
    const { conversation } = await people.createAppointment(doctor, patient, clinic);
    ok(await setPhoto(doctor, png));
    ok(await setPhoto(patient, png));
    const forPatient = ok(await patient.client.get("/conversations")).find(
      (item) => item.id === conversation.id,
    );
    const forDoctor = ok(await doctor.client.get("/conversations")).find(
      (item) => item.id === conversation.id,
    );
    assert.match(forPatient.participantImage ?? "", /photos\/users\//);
    assert.match(forDoctor.participantImage ?? "", /photos\/users\//);
  });
});

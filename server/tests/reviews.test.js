import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { startTestApp } from "./helpers.js";
import { fails, makePeople, ok } from "./people.js";

let ctx;
let people;
let clinic;
let admin;

before(async () => {
  ctx = await startTestApp();
  people = makePeople(ctx);
  ({ clinic } = await people.createCatalog());
  admin = await people.createAdmin();
});
after(() => ctx.stop());
beforeEach(() => ctx.resetRateLimits());

const named = async (name) => {
  const patient = await people.createPatient();
  await ctx.prisma.user.update({ where: { id: patient.id }, data: { name } });
  return { ...patient, name };
};
const visit = (doctor, patient, status = "completed", hour = 9) =>
  people.createAppointment(doctor, patient, clinic, { status, hour });
const review = (doctor, patient, body) => patient.client.post(`/doctors/${doctor.id}/reviews`, body);

describe("reading reviews", () => {
  it("shows a published doctor's reviews to anyone, with a summary", async () => {
    const doctor = await people.createDoctor(clinic);
    const nadia = await named("Nadia Rahman");
    const karim = await named("Karim Uddin Ahmed");
    await visit(doctor, nadia);
    await visit(doctor, karim, "completed", 10);
    ok(
      await review(doctor, nadia, { rating: 5, comment: "Listened carefully and explained everything." }),
      201,
    );
    ok(await review(doctor, karim, { rating: 4 }), 201);

    const body = ok(await ctx.client().get(`/doctors/${doctor.id}/reviews`));
    assert.deepEqual(body.summary, {
      average: 4.5,
      count: 2,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 },
    });
    assert.deepEqual(body.items.map((item) => [item.rating, item.author]).sort(), [
      [4, "Karim A."],
      [5, "Nadia R."],
    ]);
    assert.deepEqual(body.viewer, { canReview: false, myReview: null });
    assert.equal(JSON.stringify(body).includes("patientId"), false);
    assert.equal(JSON.stringify(body).includes("@test.local"), false); // no emails, no full names
  });

  it("hides the reviews of doctors who are not public, except from that doctor and administrators", async () => {
    const hidden = await people.createDoctor(clinic, { published: false });
    fails(await ctx.client().get(`/doctors/${hidden.id}/reviews`), 404, "NOT_FOUND");
    ok(await hidden.client.get(`/doctors/${hidden.id}/reviews`));
    ok(await admin.client.get(`/doctors/${hidden.id}/reviews`));
    fails(await ctx.client().get("/doctors/not-an-id/reviews"), 404, "NOT_FOUND");
  });

  it("pages through the reviews, newest first", async () => {
    const doctor = await people.createDoctor(clinic);
    for (let index = 0; index < 3; index += 1) {
      const patient = await people.createPatient();
      await visit(doctor, patient, "completed", 8 + index);
      ok(await review(doctor, patient, { rating: 5, comment: `Review number ${index}` }), 201);
    }
    const first = ok(await ctx.client().get(`/doctors/${doctor.id}/reviews?limit=2`));
    assert.deepEqual(
      first.items.map((item) => item.comment),
      ["Review number 2", "Review number 1"],
    );
    assert.equal(first.summary.count, 3);
    assert.deepEqual(
      ok(await ctx.client().get(`/doctors/${doctor.id}/reviews?limit=2&offset=2`)).items.map(
        (item) => item.comment,
      ),
      ["Review number 0"],
    );
    fails(await ctx.client().get(`/doctors/${doctor.id}/reviews?limit=500`), 422, "VALIDATION_FAILED");
  });

  it("puts the average and count on every doctor the website lists", async () => {
    const doctor = await people.createDoctor(clinic);
    const unreviewed = await people.createDoctor(clinic);
    const patient = await people.createPatient();
    await visit(doctor, patient);
    ok(await review(doctor, patient, { rating: 4 }), 201);
    const list = ok(await ctx.client().get("/doctors"));
    const find = (id) => list.find((item) => item.id === id);
    assert.equal(find(doctor.id).rating, 4);
    assert.equal(find(doctor.id).reviewCount, 1);
    assert.deepEqual([find(unreviewed.id).rating, find(unreviewed.id).reviewCount], [0, 0]);
    assert.equal(ok(await ctx.client().get(`/doctors/${doctor.id}`)).rating, 4);
  });
});

describe("writing a review", () => {
  it("lets a patient review a doctor after a completed visit, and tells the doctor", async () => {
    const doctor = await people.createDoctor(clinic);
    const patient = await named("Ayesha Siddika");
    await visit(doctor, patient);
    const before = ok(await patient.client.get(`/doctors/${doctor.id}/reviews`));
    assert.equal(before.viewer.canReview, true);

    const created = ok(
      await review(doctor, patient, { rating: 5, comment: "  Wonderful, thank you.  " }),
      201,
    );
    assert.deepEqual(
      { rating: created.rating, comment: created.comment, author: created.author, mine: created.mine },
      { rating: 5, comment: "Wonderful, thank you.", author: "Ayesha S.", mine: true },
    );

    const after = ok(await patient.client.get(`/doctors/${doctor.id}/reviews`));
    assert.equal(after.viewer.canReview, false);
    assert.equal(after.viewer.myReview.id, created.id);
    assert.equal(after.items[0].mine, true);

    const notices = ok(await doctor.client.get("/notifications")).items;
    assert.ok(notices.some((item) => item.title === "New 5-star review" && /Ayesha/.test(item.body)));
  });

  it("needs a completed visit with that doctor", async () => {
    const doctor = await people.createDoctor(clinic);
    const other = await people.createDoctor(clinic);
    const pending = await people.createPatient();
    await visit(doctor, pending, "pending");
    fails(await review(doctor, pending, { rating: 5 }), 403, "REVIEW_NOT_ELIGIBLE");

    const patient = await people.createPatient();
    await visit(other, patient); // completed, but with a different doctor
    fails(await review(doctor, patient, { rating: 5 }), 403, "REVIEW_NOT_ELIGIBLE");
    assert.equal(ok(await patient.client.get(`/doctors/${doctor.id}/reviews`)).viewer.canReview, false);
  });

  it("allows one review per doctor", async () => {
    const doctor = await people.createDoctor(clinic);
    const patient = await people.createPatient();
    await visit(doctor, patient);
    await visit(doctor, patient, "completed", 10);
    ok(await review(doctor, patient, { rating: 4 }), 201);
    fails(await review(doctor, patient, { rating: 5 }), 409, "ALREADY_REVIEWED");
  });

  it("validates the rating and the comment", async () => {
    const doctor = await people.createDoctor(clinic);
    const patient = await people.createPatient();
    await visit(doctor, patient);
    for (const rating of [0, 6, 3.5, "5", null])
      fails(await review(doctor, patient, { rating }), 422, "VALIDATION_FAILED");
    fails(await review(doctor, patient, {}), 422, "VALIDATION_FAILED");
    const long = fails(
      await review(doctor, patient, { rating: 5, comment: "x".repeat(1001) }),
      422,
      "VALIDATION_FAILED",
    );
    assert.ok(long.details.comment);
    ok(await review(doctor, patient, { rating: 5, comment: "x".repeat(1000) }), 201);
  });

  it("is only for signed-in patients", async () => {
    const doctor = await people.createDoctor(clinic);
    fails(await review(doctor, { client: ctx.client() }, { rating: 5 }), 401, "UNAUTHENTICATED");
    fails(await review(doctor, doctor, { rating: 5 }), 403, "FORBIDDEN");
    fails(await review(doctor, admin, { rating: 5 }), 403, "FORBIDDEN");
  });

  it("limits how many reviews one patient can send per hour", async () => {
    const patient = await people.createPatient();
    let last;
    for (let index = 0; index < 21; index += 1)
      last = await review({ id: "00000000-0000-4000-8000-000000000000" }, patient, { rating: 5 });
    fails(last, 429, "RATE_LIMITED");
  });
});

describe("changing or removing your review", () => {
  it("lets the author edit it and updates the rating", async () => {
    const doctor = await people.createDoctor(clinic);
    const patient = await people.createPatient();
    await visit(doctor, patient);
    const created = ok(await review(doctor, patient, { rating: 2, comment: "Waited too long" }), 201);
    const edited = ok(await patient.client.patch(`/reviews/${created.id}`, { rating: 4 }));
    assert.deepEqual([edited.rating, edited.comment], [4, "Waited too long"]);
    assert.equal(ok(await ctx.client().get(`/doctors/${doctor.id}/reviews`)).summary.average, 4);
    fails(await patient.client.patch(`/reviews/${created.id}`, {}), 422, "VALIDATION_FAILED");
    fails(await patient.client.patch(`/reviews/${created.id}`, { rating: 9 }), 422, "VALIDATION_FAILED");
  });

  it("lets the author delete it, after which they can review again", async () => {
    const doctor = await people.createDoctor(clinic);
    const patient = await people.createPatient();
    await visit(doctor, patient);
    const created = ok(await review(doctor, patient, { rating: 1 }), 201);
    assert.equal((await patient.client.delete(`/reviews/${created.id}`)).status, 204);
    assert.equal(ok(await ctx.client().get(`/doctors/${doctor.id}/reviews`)).summary.count, 0);
    ok(await review(doctor, patient, { rating: 5 }), 201);
  });

  it("keeps other people's reviews out of reach", async () => {
    const doctor = await people.createDoctor(clinic);
    const [author, stranger] = [await people.createPatient(), await people.createPatient()];
    await visit(doctor, author);
    const created = ok(await review(doctor, author, { rating: 5 }), 201);
    fails(await stranger.client.patch(`/reviews/${created.id}`, { rating: 1 }), 404, "NOT_FOUND");
    fails(await stranger.client.delete(`/reviews/${created.id}`), 404, "NOT_FOUND");
    fails(await doctor.client.delete(`/reviews/${created.id}`), 403, "FORBIDDEN");
    fails(await author.client.patch("/reviews/not-an-id", { rating: 3 }), 404, "NOT_FOUND");
  });
});

describe("moderation by administrators", () => {
  it("lists every review with full names, and hiding one removes it from the public rating", async () => {
    const doctor = await people.createDoctor(clinic);
    const [good, bad] = [await named("Good Patient"), await named("Abusive Patient")];
    await visit(doctor, good);
    await visit(doctor, bad, "completed", 10);
    ok(await review(doctor, good, { rating: 5 }), 201);
    const spam = ok(
      await review(doctor, bad, { rating: 1, comment: "Buy cheap pills at example.test" }),
      201,
    );

    const all = ok(await admin.client.get("/admin/reviews")).filter((item) => item.doctorId === doctor.id);
    assert.equal(all.length, 2);
    assert.ok(all.some((item) => item.patientName === "Abusive Patient" && item.patientEmail === bad.email));

    const hidden = ok(await admin.client.patch(`/admin/reviews/${spam.id}`, { status: "hidden" }));
    assert.equal(hidden.status, "hidden");
    const publicView = ok(await ctx.client().get(`/doctors/${doctor.id}/reviews`));
    assert.deepEqual(
      [publicView.summary.count, publicView.summary.average, publicView.items.length],
      [1, 5, 1],
    );
    assert.equal(
      ok(await admin.client.get("/admin/reviews?status=hidden")).filter((item) => item.doctorId === doctor.id)
        .length,
      1,
    );

    assert.equal(
      ok(await admin.client.patch(`/admin/reviews/${spam.id}`, { status: "visible" })).status,
      "visible",
    );
    assert.equal(ok(await ctx.client().get(`/doctors/${doctor.id}/reviews`)).summary.count, 2);
    const log = await ctx.prisma.auditLog.findMany({ where: { entityId: spam.id } });
    assert.deepEqual(log.map((entry) => entry.action).sort(), ["review.hide", "review.restore"]);
  });

  it("is for administrators only and validates input", async () => {
    const patient = await people.createPatient();
    fails(await patient.client.get("/admin/reviews"), 403, "FORBIDDEN");
    fails(await ctx.client().get("/admin/reviews"), 401, "UNAUTHENTICATED");
    fails(
      await admin.client.patch("/admin/reviews/00000000-0000-4000-8000-000000000000", { status: "hidden" }),
      404,
      "NOT_FOUND",
    );
    fails(await admin.client.patch("/admin/reviews/not-an-id", { status: "hidden" }), 404, "NOT_FOUND");
    fails(await admin.client.get("/admin/reviews?status=weird"), 422, "VALIDATION_FAILED");
  });
});

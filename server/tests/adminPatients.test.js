import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { startTestApp } from "./helpers.js";
import { PASSWORD, fails, makePeople, ok } from "./people.js";

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

const find = (list, patient) => list.find((item) => item.id === patient.id);

describe("listing patients", () => {
  it("lists every patient account with their activity, and nobody else", async () => {
    const doctor = await people.createDoctor(clinic);
    const patient = await people.createPatient();
    await people.createAppointment(doctor, patient, clinic);
    const list = ok(await admin.client.get("/admin/patients"));
    const row = find(list, patient);
    assert.deepEqual(
      {
        name: row.name,
        email: row.email,
        accountStatus: row.accountStatus,
        appointmentCount: row.appointmentCount,
      },
      { name: patient.name, email: patient.email, accountStatus: "active", appointmentCount: 1 },
    );
    assert.equal(row.emailVerified, true);
    assert.ok(row.createdAt);
    assert.equal(JSON.stringify(row).includes("passwordHash"), false);
    assert.equal(find(list, { id: doctor.userId }), undefined);
    assert.equal(
      list.some((item) => item.email === admin.email),
      false,
    );
  });

  it("searches by name, email or phone and filters by status", async () => {
    const [first, second] = [await people.createPatient(), await people.createPatient()];
    await ctx.prisma.user.update({
      where: { id: first.id },
      data: { name: "Zubaida Searchable", phone: "+8801999123456", accountStatus: "suspended" },
    });
    const ids = async (query) =>
      ok(await admin.client.get(`/admin/patients?${query}`)).map((item) => item.id);

    assert.deepEqual(await ids("query=zubaida%20search"), [first.id]);
    assert.deepEqual(await ids(`query=${encodeURIComponent(second.email.toUpperCase())}`), [second.id]);
    assert.deepEqual(await ids("query=01999123"), [first.id]);
    assert.ok((await ids("status=suspended")).includes(first.id));
    assert.ok(!(await ids("status=suspended")).includes(second.id));
    assert.ok((await ids("status=active")).includes(second.id));
    assert.deepEqual(await ids("query=nobody-has-this-name"), []);
    fails(await admin.client.get("/admin/patients?status=weird"), 422, "VALIDATION_FAILED");
  });

  it("is for administrators only", async () => {
    const patient = await people.createPatient();
    const doctor = await people.createDoctor(clinic);
    fails(await ctx.client().get("/admin/patients"), 401, "UNAUTHENTICATED");
    fails(await patient.client.get("/admin/patients"), 403, "FORBIDDEN");
    fails(await doctor.client.get("/admin/patients"), 403, "FORBIDDEN");
  });
});

describe("suspending and restoring a patient", () => {
  it("signs the patient out everywhere, blocks sign-in, and restoring lets them back", async () => {
    const patient = await people.createPatient();
    const otherDevice = await people.signIn(patient.email, "patient");
    ok(await patient.client.get("/auth/me"));

    const suspended = ok(
      await admin.client.patch(`/admin/patients/${patient.id}/status`, { status: "suspended" }),
    );
    assert.equal(suspended.accountStatus, "suspended");
    fails(await patient.client.get("/appointments"), 401, "UNAUTHENTICATED");
    fails(await otherDevice.get("/appointments"), 401, "UNAUTHENTICATED");
    fails(
      await ctx.client().post("/auth/login", { email: patient.email, password: PASSWORD, portal: "patient" }),
      403,
      "ACCOUNT_RESTRICTED",
    );

    const restored = ok(
      await admin.client.patch(`/admin/patients/${patient.id}/status`, { status: "active" }),
    );
    assert.equal(restored.accountStatus, "active");
    ok(
      await ctx.client().post("/auth/login", { email: patient.email, password: PASSWORD, portal: "patient" }),
    );
  });

  it("keeps the patient's appointments and reviews intact", async () => {
    const doctor = await people.createDoctor(clinic);
    const patient = await people.createPatient();
    await people.createAppointment(doctor, patient, clinic, { status: "completed" });
    ok(await patient.client.post(`/doctors/${doctor.id}/reviews`, { rating: 5 }), 201);
    ok(await admin.client.patch(`/admin/patients/${patient.id}/status`, { status: "suspended" }));
    assert.equal(find(ok(await admin.client.get("/admin/patients")), patient).appointmentCount, 1);
    assert.equal(ok(await ctx.client().get(`/doctors/${doctor.id}/reviews`)).summary.count, 1);
  });

  it("writes an audit trail", async () => {
    const patient = await people.createPatient();
    ok(await admin.client.patch(`/admin/patients/${patient.id}/status`, { status: "suspended" }));
    ok(await admin.client.patch(`/admin/patients/${patient.id}/status`, { status: "active" }));
    const log = await ctx.prisma.auditLog.findMany({
      where: { entityId: patient.id },
      orderBy: { createdAt: "asc" },
    });
    assert.deepEqual(
      log.map((entry) => [entry.action, entry.before.accountStatus, entry.after.accountStatus]),
      [
        ["patient.suspend", "active", "suspended"],
        ["patient.restore", "suspended", "active"],
      ],
    );
  });

  it("only works on patient accounts, with a valid status", async () => {
    const doctor = await people.createDoctor(clinic);
    const patient = await people.createPatient();
    fails(
      await admin.client.patch(`/admin/patients/${doctor.userId}/status`, { status: "suspended" }),
      404,
      "NOT_FOUND",
    );
    fails(
      await admin.client.patch("/admin/patients/not-an-id/status", { status: "suspended" }),
      404,
      "NOT_FOUND",
    );
    fails(
      await admin.client.patch("/admin/patients/00000000-0000-4000-8000-000000000000/status", {
        status: "suspended",
      }),
      404,
      "NOT_FOUND",
    );
    fails(
      await admin.client.patch(`/admin/patients/${patient.id}/status`, { status: "deleted" }),
      422,
      "VALIDATION_FAILED",
    );
    fails(await admin.client.patch(`/admin/patients/${patient.id}/status`, {}), 422, "VALIDATION_FAILED");
  });

  it("cannot be done by a patient or a visitor", async () => {
    const [patient, victim] = [await people.createPatient(), await people.createPatient()];
    fails(
      await patient.client.patch(`/admin/patients/${victim.id}/status`, { status: "suspended" }),
      403,
      "FORBIDDEN",
    );
    fails(
      await ctx.client().patch(`/admin/patients/${victim.id}/status`, { status: "suspended" }),
      401,
      "UNAUTHENTICATED",
    );
    ok(await victim.client.get("/auth/me"));
  });
});

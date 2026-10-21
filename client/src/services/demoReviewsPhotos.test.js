import { describe, expect, it } from "vitest";
import { DEMO_VERIFICATION_CODE } from "../constants.js";
import { adminService, authService, doctorService, photoService, reviewService } from "./demoBackend.js";

const credentials = (portal, email = `${portal}@example.test`) => ({ email, password: "x", portal });
const signInAdmin = () => authService.login(credentials("admin"));
const signInDoctor = () => authService.login(credentials("doctor"));
const signInPatient = () => authService.login(credentials("patient", "demo.patient@example.test"));

// The demo patient has a completed visit with d3 and none with d1.
const VISITED = "d3";
const NOT_VISITED = "d1";

const image = (type = "image/png", bytes = 8) => new File([new Uint8Array(bytes)], "me.png", { type });

describe("reviews (demo adapter)", () => {
  it("shows a doctor with no reviews an empty summary and no review form to guests", async () => {
    const result = await reviewService.list(VISITED);
    expect(result.summary).toEqual({ average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
    expect(result.items).toEqual([]);
    expect(result.viewer).toEqual({ canReview: false, myReview: null });
  });

  it("lets a patient with a completed visit review once, and updates the doctor's rating", async () => {
    await signInPatient();
    expect((await reviewService.list(VISITED)).viewer.canReview).toBe(true);

    const created = await reviewService.create(VISITED, { rating: 4, comment: "  Very kind.  " });
    expect(created).toMatchObject({ rating: 4, comment: "Very kind.", author: "Demo P.", mine: true });

    const after = await reviewService.list(VISITED);
    expect(after.summary).toMatchObject({ average: 4, count: 1 });
    expect(after.viewer).toMatchObject({ canReview: false, myReview: { id: created.id } });
    expect(await doctorService.get(VISITED)).toMatchObject({ rating: 4, reviewCount: 1 });

    await expect(reviewService.create(VISITED, { rating: 5 })).rejects.toMatchObject({
      status: 409,
      code: "ALREADY_REVIEWED",
    });
  });

  it("refuses a review without a completed visit, a bad rating, or a signed-out visitor", async () => {
    await expect(reviewService.create(VISITED, { rating: 5 })).rejects.toMatchObject({ status: 401 });
    await signInPatient();
    await expect(reviewService.create(NOT_VISITED, { rating: 5 })).rejects.toMatchObject({
      status: 403,
      code: "REVIEW_NOT_ELIGIBLE",
    });
    for (const rating of [0, 6, 2.5, undefined])
      await expect(reviewService.create(VISITED, { rating })).rejects.toMatchObject({ status: 422 });
    await expect(
      reviewService.create(VISITED, { rating: 5, comment: "x".repeat(1001) }),
    ).rejects.toMatchObject({
      status: 422,
    });
    await signInDoctor();
    await expect(reviewService.create(VISITED, { rating: 5 })).rejects.toMatchObject({ status: 403 });
  });

  it("lets the author edit and delete their review", async () => {
    await signInPatient();
    const { id } = await reviewService.create(VISITED, { rating: 2, comment: "Long wait" });
    expect(await reviewService.update(id, { rating: 5 })).toMatchObject({ rating: 5, comment: "Long wait" });
    expect((await reviewService.list(VISITED)).summary.average).toBe(5);
    await expect(reviewService.update(id, {})).rejects.toMatchObject({ status: 422 });

    await reviewService.remove(id);
    expect((await reviewService.list(VISITED)).summary.count).toBe(0);
    await expect(reviewService.remove(id)).rejects.toMatchObject({ status: 404 });
  });

  it("lets administrators hide a review from the public rating and restore it", async () => {
    await signInPatient();
    const { id } = await reviewService.create(VISITED, { rating: 1, comment: "Rude" });
    await signInAdmin();
    const all = await adminService.listReviews();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ patientName: "Demo patient", doctorId: VISITED });

    expect(await adminService.setReviewStatus(id, "hidden")).toMatchObject({ status: "hidden" });
    expect((await reviewService.list(VISITED)).summary.count).toBe(0);
    expect(await adminService.listReviews("hidden")).toHaveLength(1);
    expect(await adminService.listReviews("visible")).toHaveLength(0);

    await adminService.setReviewStatus(id, "visible");
    expect((await reviewService.list(VISITED)).summary.count).toBe(1);
    await expect(adminService.setReviewStatus(id, "weird")).rejects.toMatchObject({ status: 422 });
    await expect(adminService.setReviewStatus("nope", "hidden")).rejects.toMatchObject({ status: 404 });
  });
});

describe("profile photos (demo adapter)", () => {
  it("sets and removes a patient's photo on the session", async () => {
    await signInPatient();
    const { user } = await photoService.upload(image());
    expect(user.photoUrl).toMatch(/^data:image\/png;base64,/);
    expect((await authService.getCurrentUser()).photoUrl).toBe(user.photoUrl);

    const removed = await photoService.remove();
    expect(removed.user.photoUrl).toBeUndefined();
  });

  it("puts a doctor's photo on their public profile", async () => {
    await signInDoctor();
    const { user } = await photoService.upload(image("image/jpeg"));
    expect((await doctorService.get("d1")).image).toBe(user.photoUrl);
  });

  it("rejects other file types and files over 2 MB, and needs a sign-in", async () => {
    await expect(photoService.upload(image())).rejects.toMatchObject({ status: 401 });
    await signInPatient();
    await expect(photoService.upload(image("application/pdf"))).rejects.toMatchObject({ status: 422 });
    await expect(photoService.upload(image("image/png", 2 * 1024 * 1024 + 1))).rejects.toMatchObject({
      status: 413,
    });
    await expect(photoService.upload(undefined)).rejects.toMatchObject({ status: 422 });
  });
});

describe("patient management (demo adapter)", () => {
  it("lists patients, searches them and suspends or restores access", async () => {
    await authService.registerPatient({
      name: "Nila Akter",
      email: "nila@example.test",
      phone: "+8801811111111",
      password: "correct-horse",
    });
    await authService.verifyEmail(DEMO_VERIFICATION_CODE);

    await signInAdmin();
    const all = await adminService.listPatients();
    expect(all.map((item) => item.email)).toEqual(
      expect.arrayContaining(["demo.patient@example.test", "nila@example.test"]),
    );
    const nila = all.find((item) => item.email === "nila@example.test");
    expect(nila).toMatchObject({ accountStatus: "active", appointmentCount: 0 });
    expect(await adminService.listPatients({ query: "NILA" })).toHaveLength(1);
    expect(await adminService.listPatients({ query: "no-such-person" })).toEqual([]);

    expect(await adminService.setPatientStatus(nila.id, "suspended")).toMatchObject({
      accountStatus: "suspended",
    });
    expect(await adminService.listPatients({ status: "suspended" })).toHaveLength(1);
    await expect(authService.login(credentials("patient", "nila@example.test"))).rejects.toMatchObject({
      status: 403,
      code: "ACCOUNT_RESTRICTED",
    });

    await signInAdmin();
    await adminService.setPatientStatus(nila.id, "active");
    await expect(authService.login(credentials("patient", "nila@example.test"))).resolves.toBeTruthy();
  });

  it("is for administrators and validates input", async () => {
    await expect(adminService.listPatients()).rejects.toMatchObject({ status: 401 });
    await signInPatient();
    await expect(adminService.listPatients()).rejects.toMatchObject({ status: 403 });
    await signInAdmin();
    await expect(adminService.setPatientStatus("nope", "suspended")).rejects.toMatchObject({ status: 404 });
    await expect(adminService.setPatientStatus("demo-patient", "deleted")).rejects.toMatchObject({
      status: 422,
    });
  });
});

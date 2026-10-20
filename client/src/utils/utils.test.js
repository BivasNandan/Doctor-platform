import { describe, expect, it } from "vitest";
import { doctorsSearchPath } from "../constants.js";
import { clockLabelToMinutes, formatDateTime, localDateKey, parseDateKey, timeAgo } from "./dates.js";
import { formatFee, initials, slugify, splitList } from "./format.js";
import { isValidEmail, isValidPhone, validateAppointmentDetails, validateAttachment } from "./validation.js";

describe("date helpers", () => {
  it("formats the local calendar day, not the UTC day", () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(localDateKey(new Date(2026, 11, 31, 0, 1))).toBe("2026-12-31");
  });

  it("parses a date key at local noon", () => {
    expect(parseDateKey("2026-03-09").getDate()).toBe(9);
  });

  it("converts clock labels to minutes", () => {
    expect(clockLabelToMinutes("12:00 AM")).toBe(0);
    expect(clockLabelToMinutes("12:30 PM")).toBe(12 * 60 + 30);
    expect(clockLabelToMinutes("5:30 PM")).toBe(17 * 60 + 30);
  });
});

describe("format helpers", () => {
  it("formats fees in taka", () => {
    expect(formatFee(1500)).toBe("৳1,500");
    expect(formatFee(undefined)).toBe("৳0");
  });

  it("derives initials and skips the title", () => {
    expect(initials("Dr. Arif Rahman")).toBe("AR");
    expect(initials("")).toBe("?");
  });

  it("splits comma lists", () => {
    expect(splitList(" MBBS , FCPS,, ")).toEqual(["MBBS", "FCPS"]);
  });
});

describe("validation", () => {
  it("accepts and rejects phone numbers", () => {
    expect(isValidPhone("+880 1712-345678")).toBe(true);
    expect(isValidPhone("12345")).toBe(false);
    expect(isValidPhone("abcdefgh12")).toBe(false);
  });

  it("validates emails", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("nope@")).toBe(false);
  });

  it("slugifies names", () => {
    expect(slugify("  Child & Adolescent Health ")).toBe("child-adolescent-health");
  });

  it("reports every invalid appointment field", () => {
    const errors = validateAppointmentDetails({ patientName: "", phone: "1", email: "x", reason: "hi" });
    expect(Object.keys(errors).sort()).toEqual(["email", "patientName", "phone", "reason"]);
    expect(
      validateAppointmentDetails({
        patientName: "Rina Das",
        phone: "+8801712345678",
        email: "rina@example.test",
        reason: "Follow-up visit",
      }),
    ).toEqual({});
  });

  it("restricts attachment type and size", () => {
    expect(validateAttachment({ type: "application/pdf", size: 1024 })).toBe("");
    expect(validateAttachment({ type: "application/zip", size: 1024 })).toMatch(/PDF, JPEG/);
    expect(validateAttachment({ type: "image/png", size: 11 * 1024 * 1024 })).toMatch(/smaller than 10 MB/);
  });
});

describe("friendly times", () => {
  const now = new Date(2026, 9, 19, 15, 0); // 19 Oct 2026, 3:00 PM

  it("shows the time today, 'Yesterday' and dates after that", () => {
    expect(formatDateTime(new Date(2026, 9, 19, 9, 5).toISOString(), now)).toMatch(/9:05/);
    expect(formatDateTime(new Date(2026, 9, 18, 21, 30).toISOString(), now)).toMatch(/^Yesterday, /);
    expect(formatDateTime(new Date(2026, 9, 3, 8, 0).toISOString(), now)).toMatch(/^Oct 3, /);
    expect(formatDateTime(new Date(2025, 11, 25, 8, 0).toISOString(), now)).toMatch(/2025/);
  });

  it("leaves text that is not a timestamp alone", () => {
    expect(formatDateTime("Demo", now)).toBe("Demo");
    expect(formatDateTime(undefined, now)).toBe("");
    expect(timeAgo("Demo", now)).toBe("Demo");
  });

  it("describes how long ago something happened", () => {
    const ago = (ms) => new Date(now.getTime() - ms).toISOString();
    expect(timeAgo(ago(10_000), now)).toBe("just now");
    expect(timeAgo(ago(5 * 60_000), now)).toBe("5 min ago");
    expect(timeAgo(ago(3 * 3_600_000), now)).toBe("3 h ago");
    expect(timeAgo(ago(2 * 86_400_000), now)).toBe("2 d ago");
    expect(timeAgo(ago(30 * 86_400_000), now)).toMatch(/Sep/);
  });
});

describe("doctorsSearchPath", () => {
  it("omits empty filters", () => {
    expect(doctorsSearchPath({ query: "", specialty: "cardiology", verified: false })).toBe(
      "/doctors?specialty=cardiology",
    );
    expect(doctorsSearchPath({})).toBe("/doctors");
  });
});

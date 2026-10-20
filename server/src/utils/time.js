const dhakaClock = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Dhaka",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Today's date and the minute of the day in Dhaka. */
export function dhakaNow() {
  const parts = Object.fromEntries(dhakaClock.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function addDays(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** @db.Date column value → "YYYY-MM-DD". */
export const dateKey = (value) => value.toISOString().slice(0, 10);

/** @db.Time column value → "HH:mm". */
export const clock = (value) => value.toISOString().slice(11, 16);

/** "YYYY-MM-DD" → value for a @db.Date column. */
export const toDbDate = (key) => new Date(`${key}T00:00:00Z`);

/** "HH:mm" → value for a @db.Time column. */
export const toDbTime = (hhmm) => new Date(`1970-01-01T${hhmm}:00Z`);

export const minutesOf = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** "17:30" → "5:30 PM". */
export function timeLabel(hhmm) {
  const hours = Number(hhmm.slice(0, 2));
  return `${hours % 12 || 12}:${hhmm.slice(3, 5)} ${hours >= 12 ? "PM" : "AM"}`;
}

export const weekday = (key) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });

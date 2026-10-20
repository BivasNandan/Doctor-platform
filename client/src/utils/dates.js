/** Local calendar date as YYYY-MM-DD (never UTC, to avoid off-by-one days). */
export const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** Parses a YYYY-MM-DD key at local noon so DST shifts cannot change the day. */
export const parseDateKey = (key) => new Date(`${key}T12:00:00`);

/** "5:30 PM" -> minutes since midnight (1050). */
export function clockLabelToMinutes(label) {
  const [clock, meridiem] = label.split(" ");
  const [hours, minutes] = clock.split(":").map(Number);
  return ((hours % 12) + (meridiem === "PM" ? 12 : 0)) * 60 + minutes;
}

/** Formats a consultation fee in Bangladeshi taka. */
/**
 * "3:45 PM" today, "Yesterday, 3:45 PM", "Oct 18, 3:45 PM", or with the year for older dates.
 * Anything that is not a timestamp (for example the demo's "Demo") is returned unchanged.
 */
export function formatDateTime(value, now = new Date()) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return value ?? "";
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const dayOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((dayOf(now) - dayOf(date)) / 86_400_000);
  if (diffDays === 0) return time;
  if (diffDays === 1) return `Yesterday, ${time}`;
  const sameYear = date.getFullYear() === now.getFullYear();
  const day = date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  return `${day}, ${time}`;
}

/** "just now", "5 min ago", "3 h ago", "2 d ago", then a date. */
export function timeAgo(value, now = new Date()) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return value ?? "";
  const seconds = Math.max(0, Math.round((now - date) / 1000));
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)} h ago`;
  if (seconds < 7 * 86_400) return `${Math.round(seconds / 86_400)} d ago`;
  return formatDateTime(value, now);
}

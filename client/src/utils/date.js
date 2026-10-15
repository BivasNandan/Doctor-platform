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

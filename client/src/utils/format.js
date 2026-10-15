/** Formats a consultation fee in Bangladeshi taka. */
export const formatFee = (amount) => `৳${Number(amount ?? 0).toLocaleString()}`;

/** "Dr. Arif Rahman" -> "AR". */
export function initials(name = "") {
  return (
    name
      .replace(/^dr\.?\s+/i, "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

/** "MBBS, FCPS" -> ["MBBS", "FCPS"]. */
export const splitList = (value = "") =>
  String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const joinList = (items = []) => items.join(", ");

export const capitalize = (value = "") => value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");

/** Who an appointment is for, relative to the account holder who books it. */
export const RELATIONSHIPS = Object.freeze([
  { value: "self", label: "Myself" },
  { value: "child", label: "My child" },
  { value: "parent", label: "My parent" },
  { value: "spouse", label: "My spouse or partner" },
  { value: "sibling", label: "My brother or sister" },
  { value: "other", label: "Another family member" },
]);

export const relationshipLabel = (value) =>
  RELATIONSHIPS.find((item) => item.value === value)?.label ?? "Myself";

const SHORT_TAGS = {
  child: "child",
  parent: "parent",
  spouse: "spouse or partner",
  sibling: "sibling",
  other: "family member",
};

/** "child" for a booking made for the account holder's child; "" for their own booking. */
export const relationshipTag = (value) => SHORT_TAGS[value] ?? "";

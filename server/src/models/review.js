import { prisma } from "../config/prisma.js";

/** "Nadia Rahman" -> "Nadia R." so a review shows who wrote it without exposing the full name. */
export function publicAuthorName(name = "") {
  const [first = "", ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first || "A patient";
}

export const toReview = (review, { mine = false } = {}) => ({
  id: review.id,
  rating: review.rating,
  comment: review.comment,
  author: publicAuthorName(review.patient?.name),
  createdAt: review.createdAt.toISOString(),
  updatedAt: review.updatedAt.toISOString(),
  ...(mine ? { mine: true } : {}),
});

/** Average rating (one decimal) and number of visible reviews for each doctor id. */
export async function ratingsFor(doctorIds) {
  const result = new Map(doctorIds.map((id) => [id, { rating: 0, reviewCount: 0 }]));
  if (!doctorIds.length) return result;
  const rows = await prisma.review.groupBy({
    by: ["doctorId"],
    where: { doctorId: { in: doctorIds }, status: "visible" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  for (const row of rows)
    result.set(row.doctorId, {
      rating: Math.round((row._avg.rating ?? 0) * 10) / 10,
      reviewCount: row._count._all,
    });
  return result;
}

/** How many visible reviews gave each star rating. */
export async function distributionFor(doctorId) {
  const rows = await prisma.review.groupBy({
    by: ["rating"],
    where: { doctorId, status: "visible" },
    _count: { _all: true },
  });
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of rows) distribution[row.rating] = row._count._all;
  return distribution;
}

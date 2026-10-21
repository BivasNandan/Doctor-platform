import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { audit } from "../services/audit.js";
import { notFound, parse, uuid } from "../utils/errors.js";

const include = {
  doctor: { include: { user: { select: { name: true } } } },
  patient: { select: { name: true, email: true } },
};

const toModerationReview = (review) => ({
  id: review.id,
  doctorId: review.doctorId,
  doctorName: review.doctor.user.name,
  patientName: review.patient.name,
  patientEmail: review.patient.email,
  rating: review.rating,
  comment: review.comment,
  status: review.status,
  createdAt: review.createdAt.toISOString(),
});

/** GET /admin/reviews?status=visible|hidden → every review (full author name), newest first. */
export const listReviews = async (request, response) => {
  const { status } = parse(z.object({ status: z.enum(["visible", "hidden"]).optional() }), request.query);
  const rows = await prisma.review.findMany({
    where: status ? { status } : {},
    include,
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  response.json(rows.map(toModerationReview));
};

/** PATCH /admin/reviews/:id { status: "visible" | "hidden" }: hidden reviews disappear and stop counting. */
export const setReviewStatus = async (request, response) => {
  const id = uuid(request.params.id, "This review");
  const { status } = parse(z.object({ status: z.enum(["visible", "hidden"]) }), request.body);
  const before = await prisma.review.findUnique({ where: { id } });
  if (!before) throw notFound("This review");
  const updated = await prisma.review.update({ where: { id }, data: { status }, include });
  await audit(
    request,
    `review.${status === "hidden" ? "hide" : "restore"}`,
    "review",
    id,
    { status: before.status },
    { status },
  );
  response.json(toModerationReview(updated));
};

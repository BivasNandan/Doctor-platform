import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { distributionFor, ratingsFor, toReview } from "../models/review.js";
import { LINKS, notifyDoctor } from "../services/notifications.js";
import { ApiError, conflict, notFound, parse, uuid } from "../utils/errors.js";

const HOUR = 60 * 60 * 1000;
const PAGE = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
const reviewFields = {
  rating: z
    .number({ error: "Choose a rating from 1 to 5." })
    .int("Choose a rating from 1 to 5.")
    .min(1, "Choose a rating from 1 to 5.")
    .max(5, "Choose a rating from 1 to 5."),
  comment: z.string().trim().max(1000, "Please keep the review under 1,000 characters."),
};
const createSchema = z.object({ ...reviewFields, comment: reviewFields.comment.default("") });
// No default here: an edit that leaves the comment out must keep the existing one.
const updateSchema = z
  .object(reviewFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Nothing to change.");

/** Reviews are public for published doctors; a doctor can also read their own and administrators all. */
async function visibleDoctor(id, viewer) {
  const doctor = await prisma.doctor.findUnique({ where: { id }, include: { user: true } });
  const own = viewer?.role === "doctor" && viewer.doctor?.id === id;
  const published = doctor?.publicationStatus === "published" && doctor.user.accountStatus !== "deactivated";
  if (!doctor || !(published || own || viewer?.role === "admin")) throw notFound("This doctor profile");
  return doctor;
}

/** A patient may review a doctor once they have had a completed visit with them. */
const hasCompletedVisit = async (patientId, doctorId) =>
  Boolean(
    await prisma.appointment.findFirst({
      where: { patientId, doctorId, status: "completed" },
      select: { id: true },
    }),
  );

/**
 * GET /doctors/:id/reviews?limit&offset (public)
 * → { summary: { average, count, distribution }, items, viewer: { canReview, myReview } }
 */
export const listDoctorReviews = async (request, response) => {
  const doctorId = uuid(request.params.id, "This doctor profile");
  const { limit, offset } = parse(PAGE, request.query);
  await visibleDoctor(doctorId, request.user);

  const [summary, distribution, rows, mine] = await Promise.all([
    ratingsFor([doctorId]),
    distributionFor(doctorId),
    prisma.review.findMany({
      where: { doctorId, status: "visible" },
      include: { patient: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    request.user?.role === "patient"
      ? prisma.review.findUnique({
          where: { patientId_doctorId: { patientId: request.user.id, doctorId } },
          include: { patient: { select: { name: true } } },
        })
      : null,
  ]);
  const { rating, reviewCount } = summary.get(doctorId);
  const canReview =
    request.user?.role === "patient" && !mine && (await hasCompletedVisit(request.user.id, doctorId));
  response.json({
    summary: { average: rating, count: reviewCount, distribution },
    items: rows.map((row) => toReview(row, { mine: row.patientId === request.user?.id })),
    viewer: { canReview: Boolean(canReview), myReview: mine ? toReview(mine, { mine: true }) : null },
  });
};

/** POST /doctors/:id/reviews { rating, comment? } (patients who have had a completed visit, once per doctor) */
export const createReview = async (request, response) => {
  const doctorId = uuid(request.params.id, "This doctor profile");
  rateLimit(`review:${request.user.id}`, 20, HOUR, "You have sent many reviews. Please try again later.");
  const data = parse(createSchema, request.body);
  const doctor = await visibleDoctor(doctorId, request.user);

  if (!(await hasCompletedVisit(request.user.id, doctorId)))
    throw new ApiError(
      403,
      "REVIEW_NOT_ELIGIBLE",
      "You can review a doctor after a completed visit with them.",
    );
  if (
    await prisma.review.findUnique({
      where: { patientId_doctorId: { patientId: request.user.id, doctorId } },
      select: { id: true },
    })
  )
    throw conflict(
      "ALREADY_REVIEWED",
      "You have already reviewed this doctor. You can edit your review instead.",
    );

  const review = await prisma.review.create({
    data: { doctorId, patientId: request.user.id, rating: data.rating, comment: data.comment },
    include: { patient: { select: { name: true } } },
  });
  await notifyDoctor(doctor.id, {
    kind: "doctor",
    title: `New ${data.rating}-star review`,
    body: data.comment
      ? `${review.patient.name.split(" ")[0]} wrote: "${data.comment.slice(0, 90)}"`
      : `${review.patient.name.split(" ")[0]} rated you ${data.rating} out of 5.`,
    link: LINKS.doctorDashboard,
  });
  response.status(201).json(toReview(review, { mine: true }));
};

/** The review if it belongs to the signed-in patient; someone else's answers 404. */
async function ownReview(request) {
  const id = uuid(request.params.id, "This review");
  const review = await prisma.review.findFirst({
    where: { id, patientId: request.user.id },
    include: { patient: { select: { name: true } } },
  });
  if (!review) throw notFound("This review");
  return review;
}

/** PATCH /reviews/:id { rating?, comment? } (the author only) */
export const updateReview = async (request, response) => {
  const review = await ownReview(request);
  const data = parse(updateSchema, request.body);
  const updated = await prisma.review.update({
    where: { id: review.id },
    data,
    include: { patient: { select: { name: true } } },
  });
  response.json(toReview(updated, { mine: true }));
};

/** DELETE /reviews/:id (the author only) */
export const deleteReview = async (request, response) => {
  const review = await ownReview(request);
  await prisma.review.delete({ where: { id: review.id } });
  response.status(204).end();
};

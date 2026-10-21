import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { photoUrl } from "../models/user.js";
import { audit } from "../services/audit.js";
import { revokeAllSessions } from "../services/auth.js";
import { notFound, parse, uuid } from "../utils/errors.js";

const include = { _count: { select: { appointments: true } } };

const toPatient = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone ?? undefined,
  accountStatus: user.accountStatus,
  emailVerified: Boolean(user.emailVerifiedAt),
  photoUrl: photoUrl(user),
  appointmentCount: user._count.appointments,
  createdAt: user.createdAt.toISOString(),
  lastSeenAt: user.lastSeenAt?.toISOString(),
});

/** GET /admin/patients?query=&status=active|suspended → every patient account, newest first. */
export const listPatients = async (request, response) => {
  const { query, status } = parse(
    z.object({
      query: z.string().trim().max(100).optional(),
      status: z.enum(["active", "suspended"]).optional(),
    }),
    request.query,
  );
  const patients = await prisma.user.findMany({
    where: {
      role: "patient",
      ...(status ? { accountStatus: status } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { phone: { contains: query } },
            ],
          }
        : {}),
    },
    include,
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  response.json(patients.map(toPatient));
};

/**
 * PATCH /admin/patients/:id/status { status: "active" | "suspended" }
 * A suspended patient is signed out everywhere and cannot sign in until an administrator restores the account.
 */
export const setPatientStatus = async (request, response) => {
  const id = uuid(request.params.id, "This patient");
  const { status } = parse(z.object({ status: z.enum(["active", "suspended"]) }), request.body);
  const patient = await prisma.user.findFirst({ where: { id, role: "patient" } });
  if (!patient) throw notFound("This patient");

  const updated = await prisma.user.update({ where: { id }, data: { accountStatus: status }, include });
  if (status === "suspended") await revokeAllSessions(id);
  await audit(
    request,
    `patient.${status === "suspended" ? "suspend" : "restore"}`,
    "patient",
    id,
    { accountStatus: patient.accountStatus },
    { accountStatus: status },
  );
  response.json(toPatient(updated));
};

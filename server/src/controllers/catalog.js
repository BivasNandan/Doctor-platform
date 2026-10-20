import { prisma } from "../config/prisma.js";
import { toFacility, toSpecialty } from "../models/catalog.js";
import { findDoctors } from "../models/doctor.js";
import { notFound, uuid } from "../utils/errors.js";

/** Public, read-only data: anyone can browse without signing in. */

const text = (value) => (typeof value === "string" ? value.trim() : "");

/** GET /clinics?type=clinic|hospital: active clinics and hospitals. */
export const listClinics = async (request, response) => {
  const type = ["clinic", "hospital"].includes(request.query.type) ? request.query.type : undefined;
  const clinics = await prisma.clinic.findMany({
    where: { active: true, ...(type ? { type } : {}) },
    orderBy: { name: "asc" },
  });
  response.json(clinics.map(toFacility));
};

/** GET /specialties: active specialties. */
export const listSpecialties = async (request, response) => {
  const specialties = await prisma.specialty.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  response.json(specialties.map(toSpecialty));
};

/**
 * Only published, non-deactivated doctors are ever public. A profile stays hidden until an
 * administrator verifies it and publishes it.
 */
const publicDoctors = { publicationStatus: "published", user: { accountStatus: { not: "deactivated" } } };

/** GET /doctors: filters combine with AND (query, specialty, location, clinic, maxFee, verified, available). */
export const listDoctors = async (request, response) => {
  const { query, specialty, location, clinic, maxFee, verified, available } = request.query;
  const search = text(query);
  const place = text(location);
  const clinicText = text(clinic);

  const where = {
    ...publicDoctors,
    ...(text(specialty) ? { specialtyId: text(specialty) } : {}),
    ...(Number(maxFee) > 0 ? { fee: { lte: Number(maxFee) } } : {}),
    ...(verified === "true" ? { verificationStatus: "verified" } : {}),
    AND: [
      ...(place
        ? [
            {
              OR: [
                { location: { contains: place, mode: "insensitive" } },
                {
                  clinics: {
                    some: {
                      clinic: {
                        OR: [
                          { name: { contains: place, mode: "insensitive" } },
                          { area: { contains: place, mode: "insensitive" } },
                          { city: { contains: place, mode: "insensitive" } },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          ]
        : []),
      ...(clinicText
        ? [{ clinics: { some: { clinic: { name: { contains: clinicText, mode: "insensitive" } } } } }]
        : []),
      ...(search
        ? [
            {
              OR: [
                { user: { name: { contains: search, mode: "insensitive" } } },
                { specialty: { name: { contains: search, mode: "insensitive" } } },
                { location: { contains: search, mode: "insensitive" } },
                { clinics: { some: { clinic: { name: { contains: search, mode: "insensitive" } } } } },
              ],
            },
          ]
        : []),
    ],
  };

  let doctors = await findDoctors({ where, orderBy: [{ experienceYears: "desc" }, { createdAt: "asc" }] });
  // "Available today / tomorrow / this week" is derived from real slots, so it filters after mapping.
  if (["Today", "Tomorrow", "This week"].includes(available))
    doctors = doctors.filter((d) => d.availability.includes(available));
  response.json(doctors);
};

/** GET /doctors/:id: one public profile, or 404 when it is unpublished, deactivated or missing. */
export const getDoctor = async (request, response) => {
  const id = uuid(request.params.id, "This doctor profile");
  const [doctor] = await findDoctors({ where: { id, ...publicDoctors } });
  if (!doctor) throw notFound("This doctor profile");
  response.json(doctor);
};

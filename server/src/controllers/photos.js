import { prisma } from "../config/prisma.js";
import { sendStoredFile } from "../services/files.js";
import { clearUserPhoto, setUserPhoto } from "../services/photos.js";
import { toUser } from "../models/user.js";
import { notFound, uuid } from "../utils/errors.js";

/** POST /me/photo (multipart field `file`): sets the signed-in person's profile photo. */
export const uploadMyPhoto = async (request, response) => {
  const updated = await setUserPhoto(request.user, request.file);
  response.json({ user: toUser(updated) });
};

/** DELETE /me/photo */
export const deleteMyPhoto = async (request, response) => {
  const updated = await clearUserPhoto(request.user);
  response.json({ user: toUser(updated) });
};

/** May `viewer` see this person's photo? Doctors' photos are public once the profile is published. */
async function canSee(viewer, owner) {
  if (viewer?.id === owner.id) return { allowed: true, public: false };
  if (
    owner.role === "doctor" &&
    owner.doctor?.publicationStatus === "published" &&
    owner.accountStatus !== "deactivated"
  )
    return { allowed: true, public: true };
  if (viewer?.role === "admin") return { allowed: true, public: false };
  // A doctor may see the photo of a patient they have an appointment or a conversation with.
  if (viewer?.role === "doctor" && owner.role === "patient" && viewer.doctor?.id) {
    const doctorId = viewer.doctor.id;
    const [appointment, conversation] = await Promise.all([
      prisma.appointment.findFirst({ where: { doctorId, patientId: owner.id }, select: { id: true } }),
      prisma.conversation.findFirst({ where: { doctorId, patientId: owner.id }, select: { id: true } }),
    ]);
    if (appointment || conversation) return { allowed: true, public: false };
  }
  return { allowed: false };
}

/** GET /photos/users/:id: the image itself. Anyone else gets 404, exactly like a person with no photo. */
export const getUserPhoto = async (request, response) => {
  const id = uuid(request.params.id, "This photo");
  const owner = await prisma.user.findUnique({
    where: { id },
    include: { doctor: { select: { id: true, publicationStatus: true } } },
  });
  if (!owner?.photoKey) throw notFound("This photo");
  const access = await canSee(request.user, owner);
  if (!access.allowed) throw notFound("This photo");
  await sendStoredFile(
    response,
    { storageKey: owner.photoKey, fileName: "photo" },
    {
      inline: true,
      // Doctor photos are public and change URL when replaced (?v=), so browsers may keep them a day.
      cacheControl: access.public ? "public, max-age=86400" : "private, max-age=300",
    },
  );
};

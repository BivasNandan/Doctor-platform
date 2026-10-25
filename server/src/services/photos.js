import { prisma } from "../config/prisma.js";
import { discardUpload, saveUpload } from "./files.js";
import { userDoctorSelect } from "../models/user.js";

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

/** Stores a new profile photo for the user and removes the previous one. Resolves the updated user row. */
export async function setUserPhoto(user, file) {
  const stored = await saveUpload(`photos/users/${user.id}`, file);
  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { photoKey: stored.storageKey, photoUpdatedAt: new Date() },
      include: { doctor: { select: userDoctorSelect } },
    });
    if (user.photoKey) await discardUpload(user.photoKey);
    return updated;
  } catch (error) {
    await discardUpload(stored.storageKey); // never leave a file nobody can find
    throw error;
  }
}

/** Removes the user's profile photo (they fall back to their initials). */
export async function clearUserPhoto(user) {
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { photoKey: null, photoUpdatedAt: null },
    include: { doctor: { select: userDoctorSelect } },
  });
  if (user.photoKey) await discardUpload(user.photoKey);
  return updated;
}

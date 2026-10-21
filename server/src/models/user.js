/** URL of the person's profile photo, or undefined. The version changes whenever the photo does. */
export const photoUrl = (user) =>
  user?.photoKey ? `/api/v1/photos/users/${user.id}?v=${user.photoUpdatedAt?.getTime() ?? 0}` : undefined;

export function toUser(user) {
  return {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone ?? undefined,
    doctorId: user.doctor?.id,
    accountStatus: user.accountStatus,
    emailVerified: Boolean(user.emailVerifiedAt),
    photoUrl: photoUrl(user),
  };
}

/** URL of the person's profile photo, or undefined. The version changes whenever the photo does. */
export const photoUrl = (user) =>
  user?.photoKey ? `/api/v1/photos/users/${user.id}?v=${user.photoUpdatedAt?.getTime() ?? 0}` : undefined;

/** What every signed-in user loads about their doctor profile (if they have one). */
export const userDoctorSelect = { id: true, onboardingStatus: true };

export function toUser(user) {
  return {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone ?? undefined,
    doctorId: user.doctor?.id,
    /** Doctors only: where they are in joining Carewell (see OnboardingStatus in the schema). */
    onboardingStatus: user.doctor?.onboardingStatus,
    accountStatus: user.accountStatus,
    emailVerified: Boolean(user.emailVerifiedAt),
    photoUrl: photoUrl(user),
  };
}

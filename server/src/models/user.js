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
  };
}

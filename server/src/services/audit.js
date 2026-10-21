import { prisma } from "../config/prisma.js";

const toJson = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

/** Records who did what (and the before/after) for an administrator's decision. */
export const audit = (request, action, entityType, entityId, before, after) =>
  prisma.auditLog.create({
    data: {
      actorId: request.user.id,
      action,
      entityType,
      entityId,
      before: toJson(before),
      after: toJson(after),
    },
  });

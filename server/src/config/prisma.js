import { PrismaClient } from "@prisma/client";

// Neon is a remote database, so a multi-query transaction can take longer than Prisma's 5 s default.
export const prisma = new PrismaClient({ transactionOptions: { maxWait: 10_000, timeout: 20_000 } });

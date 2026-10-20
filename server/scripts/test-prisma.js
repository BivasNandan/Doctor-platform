import { prisma } from "../src/config/prisma.js";

try {
  await prisma.$connect();

  const result = await prisma.$queryRaw`SELECT 1 AS CONNECTED`;

  console.log("Prisma is connected to Neon DB successfully");
  console.log(result);
} catch (error) {
  console.error("Database connection failed: ", error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

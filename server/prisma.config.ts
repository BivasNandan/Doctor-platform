
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envLocalPath = resolve(projectRoot, ".env.local");
const envPath = existsSync(envLocalPath) ? envLocalPath : resolve(projectRoot, ".env");

dotenv.config({ path: envPath });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});

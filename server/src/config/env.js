import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const envLocalPath = resolve(projectRoot, ".env.local");
const envPath = existsSync(envLocalPath) ? envLocalPath : resolve(projectRoot, ".env");

if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const requiredVariables = [
  "DATABASE_URL",
  "AWS_ENDPOINT_URL_S3",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_REGION",
];
const missingVariables = requiredVariables.filter((name) => !process.env[name]);

if (missingVariables.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVariables.join(", ")}`);
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL,
  storageEndpoint: process.env.AWS_ENDPOINT_URL_S3,
  storageAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  storageSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  storageRegion: process.env.AWS_REGION,
  storageBucket: process.env.S3_BUCKET ?? "assets",
};

if (!Number.isInteger(env.port) || env.port < 1 || env.port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}
import { randomUUID } from "node:crypto";
import { pool } from "../src/db/pool.js";
import { closeStorage, deleteObject, getObject, putObject } from "../src/storage/objectStore.js";

const key = `verification/${randomUUID()}.txt`;
const contents = Buffer.from(`carewell-neon-verification:${randomUUID()}`);
let objectCreated = false;

try {
  await pool.query("SELECT 1");
  console.log("Postgres: SELECT 1 succeeded.");

  await putObject(key, contents, "text/plain");
  objectCreated = true;
  const downloaded = await getObject(key);

  if (!downloaded.equals(contents)) {
    throw new Error("Downloaded object content did not match the uploaded content");
  }

  await deleteObject(key);
  objectCreated = false;
  console.log("Object Storage: upload, download, and delete round-trip succeeded.");
} catch (error) {
  const code = error?.code ?? error?.name ?? "UnknownError";
  console.error(`Neon service verification failed (${code}).`);
  process.exitCode = 1;
} finally {
  if (objectCreated) {
    try {
      await deleteObject(key);
    } catch {
      console.error("Object Storage: temporary verification object cleanup failed.");
    }
  }

  await pool.end();
  closeStorage();
}
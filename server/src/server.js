import { app } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./config/pool.js";
import { closeStorage } from "./services/storage.js";

const server = app.listen(env.port, () => {
  console.log(`Carewell API listening on http://localhost:${env.port}`);
});

async function shutdown() {
  server.close(async () => {
    await pool.end();
    closeStorage();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

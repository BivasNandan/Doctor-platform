import pg from "pg";
import { env } from "./env.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 5,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});

export async function checkDatabase() {
  await pool.query("SELECT 1");
}

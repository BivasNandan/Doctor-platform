import express from "express";
import helmet from "helmet";
import { checkDatabase } from "./db/pool.js";
import { checkStorage } from "./storage/objectStore.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());

app.get("/api/v1/health", async (_request, response) => {
  const checks = await Promise.allSettled([checkDatabase(), checkStorage()]);
  const services = {
    postgres: checks[0].status === "fulfilled" ? "ok" : "error",
    objectStorage: checks[1].status === "fulfilled" ? "ok" : "error",
  };
  const healthy = Object.values(services).every((status) => status === "ok");

  response.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "error",
    services,
  });
});

app.use((_request, response) => {
  response.status(404).json({
    code: "NOT_FOUND",
    message: "The requested resource was not found.",
  });
});
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN.split(",").map((o) => o.trim()) }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}

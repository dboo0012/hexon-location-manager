import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import type { Store } from "./db/store.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { createAuthRouter } from "./routes/auth.js";
import { createLocationsRouter } from "./routes/locations.js";

/** Builds the Express API on top of a store (PostgreSQL under Node, D1 on Cloudflare). */
export function createApp(store: Store) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN.split(",").map((o) => o.trim()) }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", async (_req, res) => {
    const db = await store.ping();
    res
      .status(db ? 200 : 503)
      .json({ status: db ? "ok" : "degraded", database: db ? "up" : "down" });
  });

  app.use("/api/auth", createAuthRouter(store));
  app.use("/api/locations", createLocationsRouter(store));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

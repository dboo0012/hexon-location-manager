import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { checkDatabase } from "./db/pool.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { authRouter } from "./routes/auth.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN.split(",").map((o) => o.trim()) }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", async (_req, res) => {
    const db = await checkDatabase();
    res
      .status(db ? 200 : 503)
      .json({ status: db ? "ok" : "degraded", database: db ? "up" : "down" });
  });

  app.use("/api/auth", authRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

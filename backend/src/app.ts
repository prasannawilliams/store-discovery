import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health";
import { categoriesRouter, locationsRouter } from "./routes/locations";
import { marketsRouter } from "./routes/markets";
import { portfoliosRouter } from "./routes/portfolios";

export function createApp() {
  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.json({ limit: "2mb" }));

  app.use("/api/health", healthRouter);
  app.use("/api/locations", locationsRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/portfolios", portfoliosRouter);
  app.use("/api/markets", marketsRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  return app;
}

import { Router } from "express";
import { AppDataSource } from "../data-source";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  const db = AppDataSource.isInitialized ? "up" : "down";
  res.json({
    status: db === "up" ? "ok" : "degraded",
    service: "marketscope-api",
    db,
  });
});

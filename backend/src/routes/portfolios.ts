import { Router } from "express";
import multer from "multer";
import { AppDataSource } from "../data-source";
import { PortfolioUpload } from "../entities/PortfolioUpload";
import {
  createPortfolioFromFile,
  ValidationError,
} from "../services/portfolioService";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const portfoliosRouter = Router();

portfoliosRouter.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({
        error: "Validation failed",
        errors: [{ field: "file", message: "file is required" }],
      });
      return;
    }

    const saved = await createPortfolioFromFile(
      req.file.buffer,
      req.file.originalname,
    );

    res.status(201).json({
      id: saved.id,
      originalFilename: saved.originalFilename,
      rowCount: saved.rowCount,
      missingCoordinateCount: saved.missingCoordinateCount,
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: "Validation failed", errors: err.errors });
      return;
    }
    if (err instanceof multer.MulterError) {
      res.status(400).json({
        error: "Validation failed",
        errors: [{ field: "file", message: err.message }],
      });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Failed to save portfolio" });
  }
});

portfoliosRouter.get("/:id", async (req, res) => {
  const uploadRow = await AppDataSource.getRepository(PortfolioUpload).findOne({
    where: { id: req.params.id },
  });
  if (!uploadRow) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({
    id: uploadRow.id,
    originalFilename: uploadRow.originalFilename,
    rowCount: uploadRow.rowCount,
    missingCoordinateCount: uploadRow.missingCoordinateCount,
    createdAt: uploadRow.createdAt,
  });
});

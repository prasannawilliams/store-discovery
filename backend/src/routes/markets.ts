import { Router } from "express";
import {
  createMarket,
  getMarket,
  getMarketCounts,
  getMarketLayers,
  MarketValidationError,
} from "../services/marketService";
import type { BBox } from "../domain/geo";

export const marketsRouter = Router();

marketsRouter.post("/", async (req, res) => {
  try {
    const body = req.body as {
      portfolioUploadId?: string;
      cityId?: string;
      categoryIds?: string[];
      bbox?: BBox;
    };
    const market = await createMarket({
      portfolioUploadId: body.portfolioUploadId ?? "",
      cityId: body.cityId ?? "",
      categoryIds: body.categoryIds ?? [],
      bbox: body.bbox as BBox,
    });
    res.status(202).json({
      id: market.id,
      status: market.status,
      phase: market.phase,
    });
  } catch (err) {
    if (err instanceof MarketValidationError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Failed to create market" });
  }
});

marketsRouter.get("/:id", async (req, res) => {
  const market = await getMarket(req.params.id);
  if (!market) {
    res.status(404).json({ error: "Market not found" });
    return;
  }
  const [counts, layers] = await Promise.all([
    getMarketCounts(market.id),
    getMarketLayers(market.id),
  ]);
  res.json({
    id: market.id,
    status: market.status,
    phase: market.phase,
    errorMessage: market.errorMessage,
    city: { id: market.city.id, name: market.city.name },
    portfolioUploadId: market.portfolioUpload.id,
    bbox: {
      south: market.south,
      west: market.west,
      north: market.north,
      east: market.east,
    },
    areaSqKm: market.areaSqKm,
    categories: market.categories.map((category) => ({
      id: category.id,
      name: category.name,
    })),
    geocodeFailedCount: market.geocodeFailedCount,
    tilesAttempted: market.tilesAttempted,
    tilesFailed: market.tilesFailed,
    ...counts,
    layers,
    createdAt: market.createdAt,
    updatedAt: market.updatedAt,
  });
});

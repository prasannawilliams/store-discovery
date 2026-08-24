import { In } from "typeorm";
import { env } from "../config/env";
import { AppDataSource } from "../data-source";
import {
  MAX_AREA_KM2,
  areaSqKm,
  isValidBBox,
  type BBox,
} from "../domain/geo";
import { Category } from "../entities/Category";
import { City } from "../entities/City";
import { DiscoveredStore } from "../entities/DiscoveredStore";
import { Market } from "../entities/Market";
import { MarketPortfolioStore } from "../entities/MarketPortfolioStore";
import { PortfolioUpload } from "../entities/PortfolioUpload";
import { runMarketJob } from "./marketJob";

export class MarketValidationError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = "MarketValidationError";
  }
}

export type CreateMarketInput = {
  portfolioUploadId: string;
  cityId: string;
  categoryIds: string[];
  bbox: BBox;
};

export async function createMarket(input: CreateMarketInput): Promise<Market> {
  if (!input.portfolioUploadId || !input.cityId) {
    throw new MarketValidationError("portfolioUploadId and cityId are required");
  }
  if (!Array.isArray(input.categoryIds) || input.categoryIds.length === 0) {
    throw new MarketValidationError("Select at least one category");
  }
  if (!input.bbox || !isValidBBox(input.bbox)) {
    throw new MarketValidationError("bbox must have south < north and west < east");
  }

  const area = areaSqKm(input.bbox);
  if (area > MAX_AREA_KM2) {
    throw new MarketValidationError(
      `Bounding box is ${area.toFixed(1)} km²; the limit is ${MAX_AREA_KM2} km²`,
    );
  }
  if (!env.googleMapsApiKey) {
    throw new MarketValidationError("GOOGLE_MAPS_API_KEY is not configured", 503);
  }

  const upload = await AppDataSource.getRepository(PortfolioUpload).findOne({
    where: { id: input.portfolioUploadId },
  });
  if (!upload) {
    throw new MarketValidationError("Portfolio upload not found", 404);
  }

  const city = await AppDataSource.getRepository(City).findOne({
    where: { id: input.cityId },
  });
  if (!city) {
    throw new MarketValidationError("City not found", 404);
  }

  const uniqueIds = [...new Set(input.categoryIds)];
  const categories = await AppDataSource.getRepository(Category).find({
    where: { id: In(uniqueIds) },
  });
  if (categories.length !== uniqueIds.length) {
    throw new MarketValidationError("One or more categories were not found", 404);
  }

  const market = AppDataSource.getRepository(Market).create({
    portfolioUpload: upload,
    city,
    south: input.bbox.south,
    west: input.bbox.west,
    north: input.bbox.north,
    east: input.bbox.east,
    areaSqKm: Number(area.toFixed(4)),
    status: "processing",
    phase: "queued",
    categories,
  });
  const saved = await AppDataSource.getRepository(Market).save(market);

  void runMarketJob(saved.id).catch((err) => {
    console.error(`Market job ${saved.id} crashed`, err);
  });

  return saved;
}

export async function getMarket(id: string): Promise<Market | null> {
  return AppDataSource.getRepository(Market).findOne({
    where: { id },
    relations: { city: true, categories: true, portfolioUpload: true },
  });
}

export type MarketStorePoint = {
  id: string;
  name: string;
  category: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

export async function getMarketCounts(marketId: string): Promise<{
  portfolioInsideCount: number;
  portfolioOutsideCount: number;
  discoveredCount: number;
}> {
  const linkRepo = AppDataSource.getRepository(MarketPortfolioStore);
  const discoveredRepo = AppDataSource.getRepository(DiscoveredStore);

  const [portfolioInsideCount, portfolioOutsideCount, discoveredCount] =
    await Promise.all([
      linkRepo.count({ where: { market: { id: marketId }, inBoundary: true } }),
      linkRepo.count({ where: { market: { id: marketId }, inBoundary: false } }),
      discoveredRepo.count({ where: { market: { id: marketId } } }),
    ]);

  return { portfolioInsideCount, portfolioOutsideCount, discoveredCount };
}

function byName(a: MarketStorePoint, b: MarketStorePoint): number {
  return a.name.localeCompare(b.name);
}

export async function getMarketLayers(marketId: string): Promise<{
  portfolioInside: MarketStorePoint[];
  portfolioOutside: MarketStorePoint[];
  discovered: MarketStorePoint[];
}> {
  const links = await AppDataSource.getRepository(MarketPortfolioStore).find({
    where: { market: { id: marketId } },
    relations: { portfolioStore: true },
  });
  const discoveredRows = await AppDataSource.getRepository(DiscoveredStore).find({
    where: { market: { id: marketId } },
  });

  const portfolioInside: MarketStorePoint[] = [];
  const portfolioOutside: MarketStorePoint[] = [];

  for (const link of links) {
    const store = link.portfolioStore;
    const point: MarketStorePoint = {
      id: store.id,
      name: store.storeName,
      category: store.category,
      address: [store.address, store.city].filter(Boolean).join(", ") || null,
      latitude: link.latitude,
      longitude: link.longitude,
    };
    if (link.inBoundary) portfolioInside.push(point);
    else portfolioOutside.push(point);
  }

  const discovered = discoveredRows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    address: null,
    latitude: row.latitude,
    longitude: row.longitude,
  }));

  return {
    portfolioInside: portfolioInside.sort(byName),
    portfolioOutside: portfolioOutside.sort(byName),
    discovered: discovered.sort(byName),
  };
}

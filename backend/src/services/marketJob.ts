import { geocodeAddress } from "../clients/googleGeocoding";
import { PlacesError, searchNearbyPlaces } from "../clients/googlePlaces";
import { AppDataSource } from "../data-source";
import {
  bboxCenter,
  coveringRadiusMeters,
  pointInBBox,
  splitBBoxIntoQuadrants,
  tileBBoxes,
  type BBox,
} from "../domain/geo";
import { Category } from "../entities/Category";
import { DiscoveredStore } from "../entities/DiscoveredStore";
import { Market, type MarketPhase } from "../entities/Market";
import { MarketPortfolioStore } from "../entities/MarketPortfolioStore";
import { PortfolioStore } from "../entities/PortfolioStore";

const MAX_SUBDIVIDE_DEPTH = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function marketBBox(market: Market): BBox {
  return {
    south: market.south,
    west: market.west,
    north: market.north,
    east: market.east,
  };
}

function formatAddress(store: PortfolioStore): string {
  return [store.address, store.city, store.state, store.country]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

function categoryNameForPlace(types: string[], categories: Category[]): string {
  const match = categories.find((category) => types.includes(category.googleType));
  return match?.name ?? categories[0]?.name ?? "Unknown";
}

async function setPhase(market: Market, phase: MarketPhase): Promise<void> {
  market.phase = phase;
  await AppDataSource.getRepository(Market).save(market);
}

async function geocodeMissingStores(stores: PortfolioStore[]): Promise<number> {
  const storeRepo = AppDataSource.getRepository(PortfolioStore);
  let failed = 0;

  for (const store of stores) {
    if (store.latitude != null && store.longitude != null) {
      if (store.geocodeStatus === "pending") {
        store.geocodeStatus = "not_needed";
        await storeRepo.save(store);
      }
      continue;
    }

    try {
      const location = await geocodeAddress(formatAddress(store));
      if (!location) {
        store.geocodeStatus = "failed";
        failed += 1;
      } else {
        store.latitude = location.lat;
        store.longitude = location.lng;
        store.geocodeStatus = "success";
      }
    } catch (err) {
      console.error(`Geocode failed for store ${store.id}`, err);
      store.geocodeStatus = "failed";
      failed += 1;
    }
    await storeRepo.save(store);
    await sleep(50);
  }

  return failed;
}

async function classifyPortfolio(
  market: Market,
  stores: PortfolioStore[],
): Promise<void> {
  const bbox = marketBBox(market);
  const repo = AppDataSource.getRepository(MarketPortfolioStore);
  const rows = stores.map((store) => {
    const hasCoords = store.latitude != null && store.longitude != null;
    const row = new MarketPortfolioStore();
    row.market = market;
    row.portfolioStore = store;
    row.latitude = store.latitude;
    row.longitude = store.longitude;
    row.inBoundary = hasCoords
      ? pointInBBox(store.latitude as number, store.longitude as number, bbox)
      : false;
    return row;
  });
  await repo.save(rows);
}

async function searchTile(
  tile: BBox,
  includedType: string,
  depth: number,
): Promise<{
  places: Awaited<ReturnType<typeof searchNearbyPlaces>>["places"];
  failed: boolean;
}> {
  const center = bboxCenter(tile);
  try {
    const result = await searchNearbyPlaces({
      latitude: center.lat,
      longitude: center.lng,
      radiusMeters: coveringRadiusMeters(tile),
      includedType,
    });

    if (result.truncated && depth < MAX_SUBDIVIDE_DEPTH) {
      const nested: typeof result.places = [];
      let nestedFailed = false;
      for (const quad of splitBBoxIntoQuadrants(tile)) {
        const child = await searchTile(quad, includedType, depth + 1);
        nested.push(...child.places);
        nestedFailed = nestedFailed || child.failed;
      }
      return { places: nested, failed: nestedFailed };
    }

    return { places: result.places, failed: false };
  } catch (err) {
    if (err instanceof PlacesError && err.statusCode >= 500) {
      throw err;
    }
    console.error("Places tile failed", err);
    return { places: [], failed: true };
  }
}

async function discoverPlaces(
  market: Market,
  categories: Category[],
): Promise<{ tilesAttempted: number; tilesFailed: number }> {
  const bbox = marketBBox(market);
  const tiles = tileBBoxes(bbox, 2);
  const types = [...new Set(categories.map((category) => category.googleType))];
  const discoveredRepo = AppDataSource.getRepository(DiscoveredStore);
  const seen = new Set<string>();

  let tilesAttempted = 0;
  let tilesFailed = 0;

  for (const includedType of types) {
    for (const tile of tiles) {
      tilesAttempted += 1;
      const { places, failed } = await searchTile(tile, includedType, 0);
      if (failed) tilesFailed += 1;

      const rows: DiscoveredStore[] = [];
      for (const place of places) {
        if (seen.has(place.placeId)) continue;
        if (!pointInBBox(place.latitude, place.longitude, bbox)) continue;
        seen.add(place.placeId);
        const row = new DiscoveredStore();
        row.market = market;
        row.placeId = place.placeId;
        row.name = place.name;
        row.category = categoryNameForPlace(place.types, categories);
        row.latitude = place.latitude;
        row.longitude = place.longitude;
        rows.push(row);
      }
      if (rows.length > 0) {
        await discoveredRepo.save(rows);
      }
      await sleep(80);
    }
  }

  return { tilesAttempted, tilesFailed };
}

export async function runMarketJob(marketId: string): Promise<void> {
  const marketRepo = AppDataSource.getRepository(Market);
  const market = await marketRepo.findOne({
    where: { id: marketId },
    relations: { portfolioUpload: true, categories: true },
  });
  if (!market) return;

  try {
    await setPhase(market, "geocoding");
    const stores = await AppDataSource.getRepository(PortfolioStore).find({
      where: { upload: { id: market.portfolioUpload.id } },
    });
    market.geocodeFailedCount = await geocodeMissingStores(stores);
    await marketRepo.save(market);

    await setPhase(market, "classifying");
    const refreshed = await AppDataSource.getRepository(PortfolioStore).find({
      where: { upload: { id: market.portfolioUpload.id } },
    });
    await classifyPortfolio(market, refreshed);

    await setPhase(market, "discovering");
    const { tilesAttempted, tilesFailed } = await discoverPlaces(
      market,
      market.categories,
    );
    market.tilesAttempted = tilesAttempted;
    market.tilesFailed = tilesFailed;

    const discoveredCount = await AppDataSource.getRepository(DiscoveredStore).count(
      { where: { market: { id: market.id } } },
    );

    if (tilesFailed > 0 && discoveredCount === 0) {
      market.status = "failed";
      market.errorMessage = "Places Nearby failed for every tile";
    } else if (tilesFailed > 0 || market.geocodeFailedCount > 0) {
      market.status = "partial";
      market.errorMessage = [
        market.geocodeFailedCount > 0
          ? `${market.geocodeFailedCount} portfolio row(s) could not be geocoded`
          : null,
        tilesFailed > 0 ? `${tilesFailed} Places tile(s) failed` : null,
      ]
        .filter(Boolean)
        .join(". ");
    } else {
      market.status = "completed";
      market.errorMessage = null;
    }
    market.phase = "done";
    await marketRepo.save(market);
  } catch (err) {
    console.error(`Market job ${marketId} failed`, err);
    market.status = "failed";
    market.phase = "done";
    market.errorMessage =
      err instanceof Error ? err.message : "Market discovery failed";
    await marketRepo.save(market);
  }
}

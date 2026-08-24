export type FieldError = {
  row?: number;
  field?: string;
  message: string;
};

export type PortfolioUploadResponse = {
  id: string;
  originalFilename: string;
  rowCount: number;
  missingCoordinateCount: number;
};

export type NamedEntity = {
  id: string;
  name: string;
};

export type CategoryOption = NamedEntity & {
  googleType: string;
};

export type CityBoundsResponse = {
  cityId: string;
  name: string;
  bbox: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
  areaSqKm: number;
};

async function readError(res: Response): Promise<string> {
  try {
    const payload = (await res.json()) as { error?: string };
    return payload.error ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export async function uploadPortfolio(
  file: File,
): Promise<PortfolioUploadResponse> {
  const body = new FormData();
  body.append("file", file);

  const res = await fetch("/api/portfolios", {
    method: "POST",
    body,
  });

  const payload = (await res.json()) as {
    id?: string;
    originalFilename?: string;
    rowCount?: number;
    missingCoordinateCount?: number;
    error?: string;
    errors?: FieldError[];
  };

  if (!res.ok) {
    const detail = payload.errors
      ?.map((e) => (e.row ? `Row ${e.row}: ${e.message}` : e.message))
      .join(" ")
      ?? payload.error
      ?? `Upload failed (${res.status})`;
    throw new Error(detail);
  }

  return {
    id: payload.id!,
    originalFilename: payload.originalFilename!,
    rowCount: payload.rowCount!,
    missingCoordinateCount: payload.missingCoordinateCount!,
  };
}

export async function getCountries(): Promise<NamedEntity[]> {
  const res = await fetch("/api/locations/countries");
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function getStates(countryId: string): Promise<NamedEntity[]> {
  const res = await fetch(`/api/locations/countries/${countryId}/states`);
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function getCities(stateId: string): Promise<NamedEntity[]> {
  const res = await fetch(`/api/locations/states/${stateId}/cities`);
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function getCategories(): Promise<CategoryOption[]> {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function getCityBounds(cityId: string): Promise<CityBoundsResponse> {
  const res = await fetch(`/api/locations/cities/${cityId}/bounds`);
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export type CreateMarketRequest = {
  portfolioUploadId: string;
  cityId: string;
  categoryIds: string[];
  bbox: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
};

export type MarketStorePoint = {
  id: string;
  name: string;
  category: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type MarketResponse = {
  id: string;
  status: "processing" | "completed" | "partial" | "failed";
  phase: "queued" | "geocoding" | "classifying" | "discovering" | "done";
  errorMessage: string | null;
  city: NamedEntity;
  portfolioUploadId: string;
  bbox: CreateMarketRequest["bbox"];
  areaSqKm: number;
  categories: NamedEntity[];
  geocodeFailedCount: number;
  tilesAttempted: number;
  tilesFailed: number;
  portfolioInsideCount: number;
  portfolioOutsideCount: number;
  discoveredCount: number;
  createdAt: string;
  updatedAt: string;
  layers: {
    portfolioInside: MarketStorePoint[];
    portfolioOutside: MarketStorePoint[];
    discovered: MarketStorePoint[];
  };
};

export async function createMarket(
  input: CreateMarketRequest,
): Promise<{ id: string; status: string; phase: string }> {
  const res = await fetch("/api/markets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function getMarket(id: string): Promise<MarketResponse> {
  const res = await fetch(`/api/markets/${id}`);
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}


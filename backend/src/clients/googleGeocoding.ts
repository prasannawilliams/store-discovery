import { env } from "../config/env";
import type { BBox } from "../domain/geo";

type GeocodeResponse = {
  status: string;
  error_message?: string;
  results?: Array<{
    geometry?: {
      location?: { lat: number; lng: number };
      viewport?: {
        northeast: { lat: number; lng: number };
        southwest: { lat: number; lng: number };
      };
    };
  }>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GeocodingError extends Error {
  constructor(
    message: string,
    public statusCode = 502,
  ) {
    super(message);
    this.name = "GeocodingError";
  }
}

export async function geocodeCityViewport(address: string): Promise<BBox> {
  if (!env.googleMapsApiKey) {
    throw new GeocodingError("GOOGLE_MAPS_API_KEY is not configured", 503);
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", env.googleMapsApiKey);

  let lastStatus = "UNKNOWN";

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await fetch(url);
    if (res.status === 429 || res.status >= 500) {
      await sleep(400 * 2 ** attempt);
      lastStatus = String(res.status);
      continue;
    }

    const body = (await res.json()) as GeocodeResponse;
    lastStatus = body.status;

    if (body.status === "OVER_QUERY_LIMIT" || body.status === "UNKNOWN_ERROR") {
      await sleep(400 * 2 ** attempt);
      continue;
    }

    if (body.status !== "OK" || !body.results?.[0]?.geometry?.viewport) {
      throw new GeocodingError(
        body.error_message ?? `Geocoding failed (${body.status})`,
        body.status === "ZERO_RESULTS" ? 404 : 502,
      );
    }

    const viewport = body.results[0].geometry.viewport;
    return {
      south: viewport.southwest.lat,
      west: viewport.southwest.lng,
      north: viewport.northeast.lat,
      east: viewport.northeast.lng,
    };
  }

  throw new GeocodingError(`Geocoding rate-limited (${lastStatus})`, 429);
}

export async function geocodeAddress(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  if (!env.googleMapsApiKey) {
    throw new GeocodingError("GOOGLE_MAPS_API_KEY is not configured", 503);
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", env.googleMapsApiKey);

  let lastStatus = "UNKNOWN";

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await fetch(url);
    if (res.status === 429 || res.status >= 500) {
      await sleep(400 * 2 ** attempt);
      lastStatus = String(res.status);
      continue;
    }

    const body = (await res.json()) as GeocodeResponse;
    lastStatus = body.status;

    if (body.status === "OVER_QUERY_LIMIT" || body.status === "UNKNOWN_ERROR") {
      await sleep(400 * 2 ** attempt);
      continue;
    }

    if (body.status === "ZERO_RESULTS") {
      return null;
    }

    if (body.status !== "OK" || !body.results?.[0]?.geometry?.location) {
      throw new GeocodingError(
        body.error_message ?? `Geocoding failed (${body.status})`,
        502,
      );
    }

    const location = body.results[0].geometry.location;
    return { lat: location.lat, lng: location.lng };
  }

  throw new GeocodingError(`Geocoding rate-limited (${lastStatus})`, 429);
}

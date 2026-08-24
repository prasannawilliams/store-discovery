import { env } from "../config/env";

const NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby";
const FIELD_MASK =
  "places.id,places.displayName,places.location,places.types";
const MAX_RESULTS = 20;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class PlacesError extends Error {
  constructor(
    message: string,
    public statusCode = 502,
    public retryable = false,
  ) {
    super(message);
    this.name = "PlacesError";
  }
}

export type NearbyPlace = {
  placeId: string;
  name: string;
  latitude: number;
  longitude: number;
  types: string[];
};

type NearbyResponse = {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    location?: { latitude?: number; longitude?: number };
    types?: string[];
  }>;
  error?: { code?: number; message?: string; status?: string };
};

export async function searchNearbyPlaces(input: {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  includedType: string;
}): Promise<{ places: NearbyPlace[]; truncated: boolean }> {
  if (!env.googleMapsApiKey) {
    throw new PlacesError("GOOGLE_MAPS_API_KEY is not configured", 503);
  }

  const body = {
    includedTypes: [input.includedType],
    maxResultCount: MAX_RESULTS,
    rankPreference: "DISTANCE",
    locationRestriction: {
      circle: {
        center: {
          latitude: input.latitude,
          longitude: input.longitude,
        },
        radius: Math.min(50_000, Math.max(50, input.radiusMeters)),
      },
    },
  };

  let lastMessage = "UNKNOWN";

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await fetch(NEARBY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": env.googleMapsApiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    const payload = (await res.json()) as NearbyResponse;

    if (res.status === 429 || res.status >= 500) {
      lastMessage = payload.error?.message ?? String(res.status);
      await sleep(400 * 2 ** attempt);
      continue;
    }

    if (!res.ok) {
      throw new PlacesError(
        payload.error?.message ?? `Places Nearby failed (${res.status})`,
        res.status,
      );
    }

    const places: NearbyPlace[] = [];
    for (const place of payload.places ?? []) {
      if (
        !place.id ||
        place.location?.latitude == null ||
        place.location?.longitude == null
      ) {
        continue;
      }
      places.push({
        placeId: place.id,
        name: place.displayName?.text?.trim() || "Unnamed place",
        latitude: place.location.latitude,
        longitude: place.location.longitude,
        types: place.types ?? [],
      });
    }

    return { places, truncated: places.length >= MAX_RESULTS };
  }

  throw new PlacesError(`Places Nearby rate-limited (${lastMessage})`, 429, true);
}

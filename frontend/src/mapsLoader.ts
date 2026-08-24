import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

let mapsLoad: Promise<google.maps.MapsLibrary> | null = null;

export function loadMapsLibrary(): Promise<google.maps.MapsLibrary> {
  if (!mapsLoad) {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) {
      return Promise.reject(
        new Error("VITE_GOOGLE_MAPS_API_KEY is not set in the project .env"),
      );
    }
    setOptions({ key, v: "weekly" });
    mapsLoad = importLibrary("maps");
  }
  return mapsLoad;
}

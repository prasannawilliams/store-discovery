export const MAX_AREA_KM2 = 30;
const EARTH_RADIUS_KM = 6371;

export type BBox = {
  south: number;
  west: number;
  north: number;
  east: number;
};

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Spherical lat/lng rectangle area (not planar Δlat×Δlng). */
export function areaSqKm(bbox: BBox): number {
  const south = toRad(bbox.south);
  const north = toRad(bbox.north);
  const west = toRad(bbox.west);
  const east = toRad(bbox.east);
  return Math.abs(
    EARTH_RADIUS_KM *
      EARTH_RADIUS_KM *
      (Math.sin(north) - Math.sin(south)) *
      (east - west),
  );
}

export function isValidBBox(bbox: BBox): boolean {
  return (
    Number.isFinite(bbox.south) &&
    Number.isFinite(bbox.west) &&
    Number.isFinite(bbox.north) &&
    Number.isFinite(bbox.east) &&
    bbox.south < bbox.north &&
    bbox.west < bbox.east
  );
}

export function pointInBBox(
  lat: number,
  lng: number,
  bbox: BBox,
): boolean {
  return (
    lat >= bbox.south &&
    lat <= bbox.north &&
    lng >= bbox.west &&
    lng <= bbox.east
  );
}

export function bboxCenter(bbox: BBox): { lat: number; lng: number } {
  return {
    lat: (bbox.south + bbox.north) / 2,
    lng: (bbox.west + bbox.east) / 2,
  };
}

/** Smallest circle covering the rectangle, with a 5% pad. Capped at Places' 50 km. */
export function coveringRadiusMeters(bbox: BBox): number {
  const mid = bboxCenter(bbox);
  const latKm = ((bbox.north - bbox.south) / 2) * 111.32;
  const lngKm =
    ((bbox.east - bbox.west) / 2) * 111.32 * Math.cos(toRad(mid.lat));
  const meters = Math.sqrt(latKm * latKm + lngKm * lngKm) * 1000 * 1.05;
  return Math.min(50_000, Math.max(50, meters));
}

export function splitBBoxIntoQuadrants(bbox: BBox): BBox[] {
  const midLat = (bbox.south + bbox.north) / 2;
  const midLng = (bbox.west + bbox.east) / 2;
  return [
    { south: bbox.south, west: bbox.west, north: midLat, east: midLng },
    { south: bbox.south, west: midLng, north: midLat, east: bbox.east },
    { south: midLat, west: bbox.west, north: bbox.north, east: midLng },
    { south: midLat, west: midLng, north: bbox.north, east: bbox.east },
  ];
}

/** Grid the rectangle so each tile is at most ~maxTileKm on a side. */
export function tileBBoxes(bbox: BBox, maxTileKm = 2): BBox[] {
  const midLat = (bbox.south + bbox.north) / 2;
  const latKm = (bbox.north - bbox.south) * 111.32;
  const lngKm =
    (bbox.east - bbox.west) * 111.32 * Math.cos(toRad(midLat));
  const rows = Math.max(1, Math.ceil(latKm / maxTileKm));
  const cols = Math.max(1, Math.ceil(lngKm / maxTileKm));
  const latStep = (bbox.north - bbox.south) / rows;
  const lngStep = (bbox.east - bbox.west) / cols;
  const tiles: BBox[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      tiles.push({
        south: bbox.south + row * latStep,
        north: row === rows - 1 ? bbox.north : bbox.south + (row + 1) * latStep,
        west: bbox.west + col * lngStep,
        east: col === cols - 1 ? bbox.east : bbox.west + (col + 1) * lngStep,
      });
    }
  }
  return tiles;
}

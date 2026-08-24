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

import { describe, expect, it } from "vitest";
import { MAX_AREA_KM2, areaSqKm, pointInBBox, tileBBoxes } from "../src/domain/geo";

describe("areaSqKm", () => {
  it("treats a ~5 km by 6 km equatorial box as under 30 km²", () => {
    const bbox = {
      south: 0,
      west: 0,
      north: 5 / 111.195,
      east: 6 / 111.195,
    };
    const area = areaSqKm(bbox);
    expect(area).toBeGreaterThan(29);
    expect(area).toBeLessThan(MAX_AREA_KM2);
  });

  it("treats a 1° equatorial box as over 30 km²", () => {
    const area = areaSqKm({ south: 0, west: 0, north: 1, east: 1 });
    expect(area).toBeGreaterThan(MAX_AREA_KM2);
  });
});

describe("pointInBBox", () => {
  const bbox = { south: 12.9, west: 77.5, north: 13.0, east: 77.6 };

  it("includes a point inside the box", () => {
    expect(pointInBBox(12.95, 77.55, bbox)).toBe(true);
  });

  it("excludes a point outside the box", () => {
    expect(pointInBBox(12.8, 77.55, bbox)).toBe(false);
  });
});

describe("tileBBoxes", () => {
  it("keeps a tiny box as a single tile", () => {
    const bbox = {
      south: 12.97,
      west: 77.59,
      north: 12.98,
      east: 77.60,
    };
    expect(tileBBoxes(bbox, 2)).toHaveLength(1);
  });

  it("splits a ~6 km by 6 km box into multiple tiles", () => {
    const bbox = {
      south: 0,
      west: 0,
      north: 6 / 111.32,
      east: 6 / 111.32,
    };
    expect(tileBBoxes(bbox, 2).length).toBeGreaterThan(1);
  });
});

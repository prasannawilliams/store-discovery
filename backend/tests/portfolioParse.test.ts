import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { parsePortfolioBuffer } from "../src/domain/parsePortfolioFile";
import { parsePortfolioRecords } from "../src/domain/portfolio";

describe("parsePortfolioRecords", () => {
  it("rejects a missing required column", () => {
    const { errors, result } = parsePortfolioRecords([
      {
        store_name: "A",
        address: "1 Main",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        latitude: "12.9",
        longitude: "77.6",
      },
    ]);
    expect(result).toBeUndefined();
    expect(errors.some((e) => e.message.includes("missing column: category"))).toBe(
      true,
    );
  });

  it("rejects a non-numeric latitude", () => {
    const { errors, result } = parsePortfolioRecords([
      {
        store_name: "A",
        address: "1 Main",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        category: "Pharmacy",
        latitude: "south",
        longitude: "77.6",
      },
    ]);
    expect(result).toBeUndefined();
    expect(errors.some((e) => e.field === "latitude" && e.row === 2)).toBe(true);
  });

  it("allows empty latitude and longitude together", () => {
    const { errors, result } = parsePortfolioRecords([
      {
        store_name: "A",
        address: "1 Main",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        category: "Pharmacy",
        latitude: "",
        longitude: "",
      },
    ]);
    expect(errors).toEqual([]);
    expect(result?.missingCoordinates).toBe(1);
  });
});

describe("parsePortfolioBuffer", () => {
  it("parses the sample Bengaluru CSV", () => {
    const csv = readFileSync(
      path.resolve(__dirname, "../../sample/sample_portfolio_bengaluru.csv"),
    );
    const { result, errors } = parsePortfolioBuffer(
      csv,
      "sample_portfolio_bengaluru.csv",
    );
    expect(errors).toEqual([]);
    expect(result?.rows).toHaveLength(10);
    expect(result?.missingCoordinates).toBe(3);
  });
});

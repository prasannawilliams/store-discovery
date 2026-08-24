export const REQUIRED_COLUMNS = [
  "store_name",
  "address",
  "city",
  "state",
  "country",
  "category",
  "latitude",
  "longitude",
] as const;

export type FieldError = {
  row?: number;
  field?: string;
  message: string;
};

export type ParsedPortfolioRow = {
  storeName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  category: string;
  latitude: number | null;
  longitude: number | null;
};

export type ParsedPortfolio = {
  rows: ParsedPortfolioRow[];
  missingCoordinates: number;
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function cell(row: Record<string, unknown>, key: string): string {
  const raw = row[key];
  if (raw === undefined || raw === null) return "";
  return String(raw).trim();
}

function parseCoordinate(
  value: string,
  field: "latitude" | "longitude",
  row: number,
  errors: FieldError[],
): number | null {
  if (value === "") return null;
  const n = Number(value);
  const [min, max] = field === "latitude" ? [-90, 90] : [-180, 180];
  if (!Number.isFinite(n)) {
    errors.push({ row, field, message: `${field} must be a number` });
    return null;
  }
  if (n < min || n > max) {
    errors.push({
      row,
      field,
      message: `${field} must be between ${min} and ${max}`,
    });
    return null;
  }
  return n;
}

export function normalizeRowKeys(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    out[normalizeHeader(key)] = value;
  }
  return out;
}

export function parsePortfolioRecords(
  rawRows: Record<string, unknown>[],
): { result?: ParsedPortfolio; errors: FieldError[] } {
  if (rawRows.length === 0) {
    return { errors: [{ field: "file", message: "file contains no data rows" }] };
  }

  const headers = new Set(Object.keys(rawRows[0] ?? {}).map(normalizeHeader));
  const errors: FieldError[] = [];

  for (const col of REQUIRED_COLUMNS) {
    if (!headers.has(col)) {
      errors.push({ field: col, message: `missing column: ${col}` });
    }
  }
  if (errors.length > 0) {
    return { errors };
  }

  const rows: ParsedPortfolioRow[] = [];
  let missingCoordinates = 0;

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2;
    const rec = normalizeRowKeys(raw);
    const storeName = cell(rec, "store_name");
    const address = cell(rec, "address");
    const city = cell(rec, "city");
    const state = cell(rec, "state");
    const country = cell(rec, "country");
    const category = cell(rec, "category");

    if (!storeName) {
      errors.push({ field: "store_name", row: rowNumber, message: "store_name is required" });
    }
    if (!address) {
      errors.push({ field: "address", row: rowNumber, message: "address is required" });
    }
    if (!city) {
      errors.push({ field: "city", row: rowNumber, message: "city is required" });
    }
    if (!state) {
      errors.push({ field: "state", row: rowNumber, message: "state is required" });
    }
    if (!country) {
      errors.push({ field: "country", row: rowNumber, message: "country is required" });
    }
    if (!category) {
      errors.push({ field: "category", row: rowNumber, message: "category is required" });
    }

    const latText = cell(rec, "latitude");
    const lngText = cell(rec, "longitude");
    const latitude = parseCoordinate(latText, "latitude", rowNumber, errors);
    const longitude = parseCoordinate(lngText, "longitude", rowNumber, errors);

    if ((latText === "") !== (lngText === "")) {
      errors.push({
        field: latText === "" ? "latitude" : "longitude",
        row: rowNumber,
        message: "latitude and longitude must both be present or both empty",
      });
    }

    if (latText === "" && lngText === "") {
      missingCoordinates += 1;
    }

    rows.push({
      storeName,
      address,
      city,
      state,
      country,
      category,
      latitude,
      longitude,
    });
  });

  if (errors.length > 0) {
    return { errors };
  }

  return { result: { rows, missingCoordinates }, errors: [] };
}

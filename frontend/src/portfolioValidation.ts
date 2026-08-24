import Papa from "papaparse";
import { readSheet } from "read-excel-file/browser";

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

const REQUIRED_TEXT_COLUMNS = [
  "store_name",
  "address",
  "city",
  "state",
  "country",
  "category",
] as const;

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

type CellValue = string | number | boolean | Date | null | undefined;
type RawRow = Record<string, CellValue>;

export type PortfolioValidationError = {
  row?: number;
  message: string;
};

export type PortfolioValidationResult = {
  rowCount: number;
  missingCoordinates: number;
  errors: PortfolioValidationError[];
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function normalizeValue(value: CellValue): string {
  return String(value ?? "").trim();
}

function recordsFromMatrix(matrix: CellValue[][]): RawRow[] {
  const [headerRow, ...dataRows] = matrix;
  if (!headerRow) return [];

  const headers = headerRow.map(normalizeHeader);
  return dataRows
    .filter((row) => row.some((cell) => normalizeValue(cell) !== ""))
    .map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, row[index]])),
    );
}

async function parseFile(file: File): Promise<RawRow[]> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "csv") {
    const text = await file.text();
    const parsed = Papa.parse<RawRow>(text, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: normalizeHeader,
    });

    if (parsed.errors.length > 0) {
      throw new Error(parsed.errors[0]?.message ?? "The CSV could not be read.");
    }

    return parsed.data;
  }

  if (extension === "xlsx") {
    const rows = (await readSheet(file)) as CellValue[][];
    return recordsFromMatrix(rows);
  }

  throw new Error("Choose a CSV or XLSX file.");
}

function parseCoordinate(
  value: CellValue,
  field: "latitude" | "longitude",
  row: number,
  errors: PortfolioValidationError[],
): number | null {
  const text = normalizeValue(value);
  if (text === "") return null;

  const number = Number(text);
  const [minimum, maximum] = field === "latitude" ? [-90, 90] : [-180, 180];

  if (!Number.isFinite(number)) {
    errors.push({ row, message: `${field} must be a number.` });
    return null;
  }

  if (number < minimum || number > maximum) {
    errors.push({
      row,
      message: `${field} must be between ${minimum} and ${maximum}.`,
    });
    return null;
  }

  return number;
}

export async function validatePortfolioFile(
  file: File,
): Promise<PortfolioValidationResult> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      rowCount: 0,
      missingCoordinates: 0,
      errors: [{ message: "File must be 5 MB or smaller." }],
    };
  }

  let rows: RawRow[];
  try {
    rows = await parseFile(file);
  } catch (error) {
    return {
      rowCount: 0,
      missingCoordinates: 0,
      errors: [
        {
          message:
            error instanceof Error ? error.message : "The file could not be read.",
        },
      ],
    };
  }

  if (rows.length === 0) {
    return {
      rowCount: 0,
      missingCoordinates: 0,
      errors: [{ message: "The file contains no store rows." }],
    };
  }

  const errors: PortfolioValidationError[] = [];
  const headers = new Set(Object.keys(rows[0] ?? {}).map(normalizeHeader));

  for (const column of REQUIRED_COLUMNS) {
    if (!headers.has(column)) {
      errors.push({ message: `Missing required column: ${column}.` });
    }
  }

  if (errors.length > 0) {
    return { rowCount: rows.length, missingCoordinates: 0, errors };
  }

  let missingCoordinates = 0;

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    for (const column of REQUIRED_TEXT_COLUMNS) {
      if (normalizeValue(row[column]) === "") {
        errors.push({ row: rowNumber, message: `${column} is required.` });
      }
    }

    const latitudeText = normalizeValue(row.latitude);
    const longitudeText = normalizeValue(row.longitude);
    const latitude = parseCoordinate(row.latitude, "latitude", rowNumber, errors);
    const longitude = parseCoordinate(
      row.longitude,
      "longitude",
      rowNumber,
      errors,
    );

    if (latitudeText === "" && longitudeText === "") {
      missingCoordinates += 1;
    } else if (latitudeText === "" || longitudeText === "") {
      errors.push({
        row: rowNumber,
        message: "latitude and longitude must both be present or both be empty.",
      });
    } else if (latitude === null || longitude === null) {
      // Coordinate-specific errors were added above.
    }
  });

  return { rowCount: rows.length, missingCoordinates, errors };
}

import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { parsePortfolioRecords, type FieldError, type ParsedPortfolio } from "./portfolio";

const MAX_BYTES = 5 * 1024 * 1024;

export function parsePortfolioBuffer(
  buffer: Buffer,
  originalName: string,
): { result?: ParsedPortfolio; errors: FieldError[] } {
  if (buffer.length > MAX_BYTES) {
    return { errors: [{ field: "file", message: "file must be 5 MB or smaller" }] };
  }

  const ext = originalName.split(".").pop()?.toLowerCase();
  let records: Record<string, unknown>[];

  try {
    if (ext === "csv") {
      records = parse(buffer, {
        columns: (headers: string[]) =>
          headers.map((h) => String(h).trim().toLowerCase().replace(/\s+/g, "_")),
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
      }) as Record<string, unknown>[];
    } else if (ext === "xlsx") {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return { errors: [{ field: "file", message: "workbook has no sheets" }] };
      }
      records = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        defval: "",
        raw: false,
      }) as Record<string, unknown>[];
    } else {
      return { errors: [{ field: "file", message: "file must be CSV or XLSX" }] };
    }
  } catch {
    return { errors: [{ field: "file", message: "file could not be parsed" }] };
  }

  return parsePortfolioRecords(records);
}

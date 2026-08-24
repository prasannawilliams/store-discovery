import { AppDataSource } from "../data-source";
import { parsePortfolioBuffer } from "../domain/parsePortfolioFile";
import { FieldError } from "../domain/portfolio";
import { PortfolioStore } from "../entities/PortfolioStore";
import { PortfolioUpload } from "../entities/PortfolioUpload";

export class ValidationError extends Error {
  constructor(public errors: FieldError[]) {
    super("Validation failed");
    this.name = "ValidationError";
  }
}

export async function createPortfolioFromFile(
  buffer: Buffer,
  originalFilename: string,
): Promise<PortfolioUpload> {
  const parsed = parsePortfolioBuffer(buffer, originalFilename);
  if (!parsed.result || parsed.errors.length > 0) {
    throw new ValidationError(parsed.errors);
  }

  const { rows, missingCoordinates } = parsed.result;
  const repo = AppDataSource.getRepository(PortfolioUpload);

  const upload = repo.create({
    originalFilename,
    rowCount: rows.length,
    missingCoordinateCount: missingCoordinates,
    stores: rows.map((row) => {
      const store = new PortfolioStore();
      store.storeName = row.storeName;
      store.address = row.address;
      store.city = row.city;
      store.state = row.state;
      store.country = row.country;
      store.category = row.category;
      store.latitude = row.latitude;
      store.longitude = row.longitude;
      store.geocodeStatus =
        row.latitude === null || row.longitude === null ? "pending" : "not_needed";
      return store;
    }),
  });

  return repo.save(upload);
}

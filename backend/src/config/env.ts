import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3001),
  db: {
    host: process.env.DATABASE_HOST ?? "localhost",
    port: Number(process.env.DATABASE_PORT ?? 5432),
    username: process.env.DATABASE_USER ?? "marketscope",
    password: process.env.DATABASE_PASSWORD ?? "marketscope",
    database: process.env.DATABASE_NAME ?? "marketscope",
  },
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",
};

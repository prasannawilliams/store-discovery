import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "./config/env";
import { Category } from "./entities/Category";
import { City } from "./entities/City";
import { Country } from "./entities/Country";
import { DiscoveredStore } from "./entities/DiscoveredStore";
import { Market } from "./entities/Market";
import { MarketPortfolioStore } from "./entities/MarketPortfolioStore";
import { PortfolioStore } from "./entities/PortfolioStore";
import { PortfolioUpload } from "./entities/PortfolioUpload";
import { State } from "./entities/State";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: env.db.host,
  port: env.db.port,
  username: env.db.username,
  password: env.db.password,
  database: env.db.database,
  synchronize: env.nodeEnv !== "production",
  logging: env.nodeEnv === "development",
  entities: [
    Country,
    State,
    City,
    Category,
    PortfolioUpload,
    PortfolioStore,
    Market,
    MarketPortfolioStore,
    DiscoveredStore,
  ],
  migrations: [],
});

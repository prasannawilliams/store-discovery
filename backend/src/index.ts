import "reflect-metadata";
import { createApp } from "./app";
import { env } from "./config/env";
import { AppDataSource } from "./data-source";
import { seedReferenceData } from "./seed/referenceData";

async function main() {
  await AppDataSource.initialize();
  console.log("PostgreSQL connected");
  await seedReferenceData();
  console.log("Reference data seeded");

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start API", err);
  process.exit(1);
});

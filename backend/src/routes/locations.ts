import { Router } from "express";
import { GeocodingError, geocodeCityViewport } from "../clients/googleGeocoding";
import { AppDataSource } from "../data-source";
import { areaSqKm } from "../domain/geo";
import { Category } from "../entities/Category";
import { City } from "../entities/City";
import { Country } from "../entities/Country";
import { State } from "../entities/State";

export const locationsRouter = Router();

locationsRouter.get("/countries", async (_req, res) => {
  const rows = await AppDataSource.getRepository(Country).find({
    order: { name: "ASC" },
  });
  res.json(rows.map((c) => ({ id: c.id, name: c.name })));
});

locationsRouter.get("/countries/:countryId/states", async (req, res) => {
  const rows = await AppDataSource.getRepository(State).find({
    where: { country: { id: req.params.countryId } },
    order: { name: "ASC" },
  });
  res.json(rows.map((s) => ({ id: s.id, name: s.name })));
});

locationsRouter.get("/states/:stateId/cities", async (req, res) => {
  const rows = await AppDataSource.getRepository(City).find({
    where: { state: { id: req.params.stateId } },
    order: { name: "ASC" },
  });
  res.json(rows.map((c) => ({ id: c.id, name: c.name })));
});

locationsRouter.get("/cities/:cityId/bounds", async (req, res) => {
  const city = await AppDataSource.getRepository(City).findOne({
    where: { id: req.params.cityId },
    relations: { state: { country: true } },
  });
  if (!city) {
    res.status(404).json({ error: "City not found" });
    return;
  }

  const address = `${city.name}, ${city.state.name}, ${city.state.country.name}`;
  try {
    const bbox = await geocodeCityViewport(address);
    res.json({
      cityId: city.id,
      name: city.name,
      bbox,
      areaSqKm: Number(areaSqKm(bbox).toFixed(2)),
    });
  } catch (err) {
    if (err instanceof GeocodingError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(502).json({ error: "Failed to geocode city bounds" });
  }
});

export const categoriesRouter = Router();

categoriesRouter.get("/", async (_req, res) => {
  const rows = await AppDataSource.getRepository(Category).find({
    order: { name: "ASC" },
  });
  res.json(rows.map((c) => ({ id: c.id, name: c.name, googleType: c.googleType })));
});

import { AppDataSource } from "../data-source";
import { Category } from "../entities/Category";
import { City } from "../entities/City";
import { Country } from "../entities/Country";
import { State } from "../entities/State";

const GEOGRAPHY = {
  name: "India",
  states: [
    { name: "Karnataka", cities: ["Bengaluru"] },
    { name: "Maharashtra", cities: ["Mumbai"] },
    { name: "Delhi", cities: ["New Delhi"] },
  ],
};

const CATEGORIES: { name: string; googleType: string }[] = [
  { name: "Supermarket", googleType: "supermarket" },
  { name: "Pharmacy", googleType: "pharmacy" },
  { name: "Hypermarket", googleType: "supermarket" },
  { name: "Grocery Store", googleType: "grocery_store" },
  { name: "Convenience Store", googleType: "convenience_store" },
];

export async function seedReferenceData(): Promise<void> {
  const countryRepo = AppDataSource.getRepository(Country);
  const stateRepo = AppDataSource.getRepository(State);
  const cityRepo = AppDataSource.getRepository(City);
  const categoryRepo = AppDataSource.getRepository(Category);

  let country = await countryRepo.findOne({ where: { name: GEOGRAPHY.name } });
  if (!country) {
    country = await countryRepo.save(countryRepo.create({ name: GEOGRAPHY.name }));
  }

  for (const stateSeed of GEOGRAPHY.states) {
    let state = await stateRepo.findOne({
      where: { name: stateSeed.name, country: { id: country.id } },
      relations: { country: true },
    });
    if (!state) {
      state = await stateRepo.save(
        stateRepo.create({ name: stateSeed.name, country }),
      );
    }
    for (const cityName of stateSeed.cities) {
      const existing = await cityRepo.findOne({
        where: { name: cityName, state: { id: state.id } },
      });
      if (!existing) {
        await cityRepo.save(cityRepo.create({ name: cityName, state }));
      }
    }
  }

  for (const cat of CATEGORIES) {
    const existing = await categoryRepo.findOne({ where: { name: cat.name } });
    if (!existing) {
      await categoryRepo.save(categoryRepo.create(cat));
    }
  }
}

import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { City } from "./City";
import { Country } from "./Country";

@Entity({ name: "states" })
@Unique(["name", "country"])
export class State {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar" })
  name: string;

  @ManyToOne(() => Country, (country) => country.states, { nullable: false })
  country: Country;

  @OneToMany(() => City, (city) => city.state)
  cities: City[];
}

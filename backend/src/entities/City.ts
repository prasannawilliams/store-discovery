import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { State } from "./State";

@Entity({ name: "cities" })
@Unique(["name", "state"])
export class City {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar" })
  name: string;

  @ManyToOne(() => State, (state) => state.cities, { nullable: false })
  state: State;
}

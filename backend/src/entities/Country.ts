import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { State } from "./State";

@Entity({ name: "countries" })
export class Country {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", unique: true })
  name: string;

  @OneToMany(() => State, (state) => state.country)
  states: State[];
}

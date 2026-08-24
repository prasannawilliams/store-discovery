import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Market } from "./Market";

@Entity({ name: "discovered_stores" })
@Index(["market", "placeId"], { unique: true })
export class DiscoveredStore {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Market, (market) => market.discoveredStores, {
    nullable: false,
    onDelete: "CASCADE",
  })
  market: Market;

  @Column({ type: "varchar" })
  placeId: string;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "varchar" })
  category: string;

  @Column({ type: "float" })
  latitude: number;

  @Column({ type: "float" })
  longitude: number;
}

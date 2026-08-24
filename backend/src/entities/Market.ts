import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Category } from "./Category";
import { City } from "./City";
import { DiscoveredStore } from "./DiscoveredStore";
import { MarketPortfolioStore } from "./MarketPortfolioStore";
import { PortfolioUpload } from "./PortfolioUpload";

export type MarketStatus = "processing" | "completed" | "partial" | "failed";
export type MarketPhase =
  | "queued"
  | "geocoding"
  | "classifying"
  | "discovering"
  | "done";

@Entity({ name: "markets" })
export class Market {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => PortfolioUpload, { nullable: false })
  portfolioUpload: PortfolioUpload;

  @ManyToOne(() => City, { nullable: false })
  city: City;

  @Column({ type: "float" })
  south: number;

  @Column({ type: "float" })
  west: number;

  @Column({ type: "float" })
  north: number;

  @Column({ type: "float" })
  east: number;

  @Column({ type: "float" })
  areaSqKm: number;

  @Column({ type: "varchar", default: "processing" })
  status: MarketStatus;

  @Column({ type: "varchar", default: "queued" })
  phase: MarketPhase;

  @Column({ type: "text", nullable: true })
  errorMessage: string | null;

  @Column({ type: "int", default: 0 })
  geocodeFailedCount: number;

  @Column({ type: "int", default: 0 })
  tilesAttempted: number;

  @Column({ type: "int", default: 0 })
  tilesFailed: number;

  @ManyToMany(() => Category)
  @JoinTable({ name: "market_categories" })
  categories: Category[];

  @OneToMany(() => MarketPortfolioStore, (row) => row.market, { cascade: true })
  portfolioLinks: MarketPortfolioStore[];

  @OneToMany(() => DiscoveredStore, (row) => row.market)
  discoveredStores: DiscoveredStore[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

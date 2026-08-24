import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Market } from "./Market";
import { PortfolioStore } from "./PortfolioStore";

@Entity({ name: "market_portfolio_stores" })
@Index(["market", "portfolioStore"], { unique: true })
export class MarketPortfolioStore {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Market, (market) => market.portfolioLinks, {
    nullable: false,
    onDelete: "CASCADE",
  })
  market: Market;

  @ManyToOne(() => PortfolioStore, { nullable: false, onDelete: "CASCADE" })
  portfolioStore: PortfolioStore;

  @Column({ type: "boolean" })
  inBoundary: boolean;

  @Column({ type: "float", nullable: true })
  latitude: number | null;

  @Column({ type: "float", nullable: true })
  longitude: number | null;
}

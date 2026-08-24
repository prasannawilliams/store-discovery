import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { PortfolioUpload } from "./PortfolioUpload";

export type GeocodeStatus = "not_needed" | "pending" | "success" | "failed";

@Entity({ name: "portfolio_stores" })
export class PortfolioStore {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => PortfolioUpload, (upload) => upload.stores, {
    nullable: false,
    onDelete: "CASCADE",
  })
  upload: PortfolioUpload;

  @Column({ type: "varchar" })
  storeName: string;

  @Column({ type: "varchar" })
  address: string;

  @Column({ type: "varchar" })
  city: string;

  @Column({ type: "varchar" })
  state: string;

  @Column({ type: "varchar" })
  country: string;

  @Column({ type: "varchar" })
  category: string;

  @Column({ type: "float", nullable: true })
  latitude: number | null;

  @Column({ type: "float", nullable: true })
  longitude: number | null;

  @Column({ type: "varchar", default: "pending" })
  geocodeStatus: GeocodeStatus;
}

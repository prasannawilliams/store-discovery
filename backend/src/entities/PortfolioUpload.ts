import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { PortfolioStore } from "./PortfolioStore";

@Entity({ name: "portfolio_uploads" })
export class PortfolioUpload {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar" })
  originalFilename: string;

  @Column({ type: "int" })
  rowCount: number;

  @Column({ type: "int", default: 0 })
  missingCoordinateCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => PortfolioStore, (store) => store.upload, { cascade: true })
  stores: PortfolioStore[];
}

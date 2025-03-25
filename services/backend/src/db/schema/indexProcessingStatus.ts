import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { EtfPrice } from "./etfPrice";
import { EtfFundingReward } from "./eftFundingReward";
import { AverageFundingChartData } from "./averageFunding";
import { Rebalance } from "./rebalance";
import { sUSDeApy } from "./sUsdApy";
import { sUSDeSpreadVs3mTreasury } from "./sUSDeSpreadVs3mTreasury";

export const IndexProcessingStatus = pgTable("index_processing_status", {
  id: serial("id").notNull(),
  etfId: text("etf_id").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true })
    .notNull()
    .defaultNow(),
  status: text("status").notNull(),
});

export const IndexProcessingStatusRelations = relations(
  IndexProcessingStatus,
  ({ many }) => ({
    etfPrice: many(EtfPrice),
    etfReward: many(EtfFundingReward),
    averageFundingChartData: many(AverageFundingChartData),
    rebalance: many(Rebalance),
    sUSDeApy: many(sUSDeApy),
    sUSDeSpreadVs3mTreasury: many(sUSDeSpreadVs3mTreasury),
  })
);

import {
  doublePrecision,
  index,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const FundingRewardApy = pgTable(
  "funding_reward_apy",
  {
    id: serial("id").primaryKey(),
    etfId: text("etf_id").notNull(),
    time: timestamp("timestamp").notNull(),
    value: doublePrecision("value").notNull(),
  },
  (table) => {
    return {
      // Composite index on coinId and timestamp
      coinIdTimeIdx: index("funding_reward_apy_coin_id_time_idx").on(
        table.time
      ),
      etfIdIdx: index("funding_reward_apy_etf_id_idx").on(table.etfId),
    };
  }
);

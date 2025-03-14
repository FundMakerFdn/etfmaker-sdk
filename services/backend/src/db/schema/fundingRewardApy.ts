import {
  doublePrecision,
  uniqueIndex,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const FundingRewardApy = pgTable(
  "funding_reward_apy",
  {
    id: serial("id").notNull(),
    etfId: text("etf_id").notNull(),
    time: timestamp("timestamp", { withTimezone: true }).notNull(),
    value: doublePrecision("value").notNull(),
  },
  (table) => {
    return {
      etfIdIdx: uniqueIndex("funding_reward_apy_etf_id_idx").on(
        table.etfId,
        table.time
      ),
      pk: primaryKey({ columns: [table.id, table.time] }),
    };
  }
);

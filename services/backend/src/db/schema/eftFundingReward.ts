import { pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";

export const EtfFundingReward = pgTable(
  "etf_funding_reward",
  {
    id: serial("id").primaryKey(),
    etfId: text("etf_id").notNull(),
    timestamp: timestamp("timestamp").notNull(),
    reward: text("reward").notNull(),
  },
  (table) => {
    return {
      // Composite index on etfId and timestamp
      etfIdTimestampIdx: index("etf_funding_reward_etf_id_timestamp_idx").on(
        table.etfId,
        table.timestamp
      ),
    };
  }
);

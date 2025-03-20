import {
  pgTable,
  serial,
  text,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

export const EtfFundingReward = pgTable(
  "etf_funding_reward",
  {
    id: serial("id").notNull(),
    etfId: text("etf_id").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    reward: text("reward").notNull(),
  },
  (table) => {
    return {
      // Composite index on etfId and timestamp
      etfIdTimestampIdx: index("etf_funding_reward_etf_id_timestamp_idx").on(
        table.etfId,
        table.timestamp
      ),
      pk: primaryKey({ columns: [table.id, table.timestamp] }),
    };
  }
);

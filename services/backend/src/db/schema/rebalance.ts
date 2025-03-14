import {
  pgTable,
  jsonb,
  serial,
  text,
  timestamp,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";

export const Rebalance = pgTable(
  "rebalance",
  {
    id: serial("id").notNull(),
    etfId: text("etf_id").notNull(),
    coinCategory: text("coin_category"),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    price: text("price").notNull(),
    data: jsonb("data").notNull(),
    spread: text("spread"),
  },
  (table) => {
    return {
      // Composite index on etfId and timestamp
      etfIdTimestampIdx: uniqueIndex("rebalance_etf_id_timestamp_idx").on(
        table.etfId,
        table.timestamp
      ),
      pk: primaryKey({ columns: [table.id, table.timestamp] }),
    };
  }
);

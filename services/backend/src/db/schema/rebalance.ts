import {
  pgTable,
  jsonb,
  serial,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const Rebalance = pgTable(
  "rebalance",
  {
    id: serial("id").primaryKey(),
    etfId: text("etf_id").notNull(),
    coinCategory: text("coin_category"),
    timestamp: timestamp("timestamp").notNull(),
    price: text("price").notNull(),
    data: jsonb("data").notNull(),
    spread: text("spread"),
  },
  (table) => {
    return {
      // Composite index on etfId and timestamp
      etfIdTimestampIdx: index("rebalance_etf_id_timestamp_idx").on(
        table.etfId,
        table.timestamp
      ),
    };
  }
);

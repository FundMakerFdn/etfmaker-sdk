import {
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Main table definition
export const EtfPrice = pgTable(
  "etf_price",
  {
    id: serial("id").notNull(),
    etfId: text("etf_id").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    open: text("open").notNull(),
    high: text("high").notNull(),
    low: text("low").notNull(),
    close: text("close").notNull(),
  },
  (table) => ({
    etfIdTimestampIdx: uniqueIndex("etf_price_etf_id_timestamp_idx").on(
      table.etfId,
      table.timestamp
    ),
    pk: primaryKey({ columns: [table.id, table.timestamp] }),
  })
);

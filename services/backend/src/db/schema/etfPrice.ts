import { index, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Main table definition
export const EtfPrice = pgTable(
  "etf_price",
  {
    id: serial("id").primaryKey(),
    etfId: text("etf_id").notNull(),
    timestamp: timestamp("timestamp").notNull(),
    open: text("open").notNull(),
    high: text("high").notNull(),
    low: text("low").notNull(),
    close: text("close").notNull(),
  },
  (table) => ({
    etfIdTimestampIdx: index("etf_price_etf_id_timestamp_idx").on(
      table.etfId,
      table.timestamp
    ),
  })
);

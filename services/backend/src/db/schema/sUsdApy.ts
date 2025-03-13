import {
  doublePrecision,
  index,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const sUSDeApy = pgTable(
  "susd_apy",
  {
    id: serial("id").primaryKey(),
    etfId: text("etf_id").notNull(),
    time: timestamp("timestamp").notNull(),
    value: doublePrecision("value").notNull(),
  },
  (table) => {
    return {
      // Composite index on coinId and timestamp
      coinIdTimeIdx: index("susd_apy_time_idx").on(table.time),
      etfIdIdx: index("susd_apy_etf_id_idx").on(table.etfId),
    };
  }
);

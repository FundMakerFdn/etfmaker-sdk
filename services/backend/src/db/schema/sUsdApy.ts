import {
  doublePrecision,
  uniqueIndex,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const sUSDeApy = pgTable(
  "susd_apy",
  {
    id: serial("id").notNull(),
    etfId: text("etf_id").notNull(),
    time: timestamp("timestamp", { withTimezone: true }).notNull(),
    value: doublePrecision("value").notNull(),
  },
  (table) => {
    return {
      etfIdIdx: uniqueIndex("susd_apy_etf_id_idx").on(table.etfId, table.time),
      pk: primaryKey({ columns: [table.id, table.time] }),
    };
  }
);

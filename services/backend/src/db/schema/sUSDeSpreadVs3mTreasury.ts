import {
  pgTable,
  integer,
  doublePrecision,
  serial,
  text,
  timestamp,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";

export const sUSDeSpreadVs3mTreasury = pgTable(
  "susd_spread_vs_3m_treasury",
  {
    id: serial("id").notNull(),
    coinId: integer("coin_id").notNull(),
    etfId: text("etf_id").notNull(),
    time: timestamp("timestamp", { withTimezone: true }).notNull(),
    value: doublePrecision("value").notNull(),
  },
  (table) => {
    return {
      etfIdIdx: uniqueIndex("susd_spread_vs_3m_treasury_etfId_idx").on(
        table.etfId,
        table.time
      ),
      coinIdIdx: uniqueIndex("susd_spread_vs_3m_treasury_coinId_idx").on(
        table.coinId,
        table.time
      ),
      pk: primaryKey({ columns: [table.id, table.time] }),
    };
  }
);

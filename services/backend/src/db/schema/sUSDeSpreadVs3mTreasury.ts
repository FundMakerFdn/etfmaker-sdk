import {
  pgTable,
  integer,
  doublePrecision,
  serial,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const sUSDeSpreadVs3mTreasury = pgTable(
  "susd_spread_vs_3m_treasury",
  {
    id: serial("id").primaryKey(),
    coinId: integer("coin_id").notNull(),
    etfId: text("etf_id").notNull(),
    time: timestamp("timestamp").notNull(),
    value: doublePrecision("value").notNull(),
  },
  (table) => {
    return {
      timeIdx: index("susd_spread_vs_3m_treasury_time_idx").on(table.time),
      etfIdIdx: index("susd_spread_vs_3m_treasury_etfId_idx").on(table.etfId),
      coinIdIdx: index("susd_spread_vs_3m_treasury_coinId_idx").on(
        table.coinId
      ),
    };
  }
);

import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  doublePrecision,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

export const AverageFundingChartData = pgTable(
  "average_funding_chart_data",
  {
    id: serial("id").notNull(),
    etfId: text("etf_id").notNull(),
    coinId: integer("coin_id").notNull(),
    time: timestamp("timestamp", { withTimezone: true }).notNull(),
    value: doublePrecision("value").notNull(),
  },
  (table) => {
    return {
      coinIdIdx: index("average_funding_chart_data_coinId_idx").on(
        table.coinId,
        table.time
      ),
      etfIdIdx: index("average_funding_chart_data_etfId_idx").on(
        table.etfId,
        table.time
      ),
      pk: primaryKey({ columns: [table.id, table.time] }),
    };
  }
);

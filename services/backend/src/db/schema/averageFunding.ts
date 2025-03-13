import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  index,
  doublePrecision,
} from "drizzle-orm/pg-core";

export const AverageFundingChartData = pgTable(
  "average_funding_chart_data",
  {
    id: serial("id").primaryKey(),
    etfId: text("etf_id").notNull(),
    coinId: integer("coin_id").notNull(),
    time: timestamp("timestamp").notNull(),
    value: doublePrecision("value").notNull(),
  },
  (table) => {
    return {
      timeIdx: index("average_funding_chart_data_time_idx").on(table.time),
      coinIdIdx: index("average_funding_chart_data_coinId_idx").on(
        table.coinId
      ),
      etfIdIdx: index("average_funding_chart_data_etfId_idx").on(table.etfId),
    };
  }
);

import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { Coins } from "./coins";

export const Candles = pgTable(
  "candles",
  {
    id: serial("id").primaryKey(),
    coinId: integer("coin_id")
      .notNull()
      .references(() => Coins.id),
    timestamp: timestamp("timestamp").notNull(),
    open: text("open").notNull(),
    high: text("high").notNull(),
    low: text("low").notNull(),
    close: text("close").notNull(),
    volume: text("volume").notNull(),
  },
  (table) => {
    return {
      // Composite index on coinId and timestamp for faster filtering and sorting
      coinIdTimestampIdx: index("coin_id_timestamp_idx").on(
        table.coinId,
        table.timestamp
      ),
      // Index on timestamp for sorting
      timestampIdx: index("timestamp_idx").on(table.timestamp),
    };
  }
);

export const CandlesRelations = relations(Candles, ({ one }) => ({
  coin: one(Coins, {
    fields: [Candles.coinId],
    references: [Coins.id],
  }),
}));

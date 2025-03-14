import { relations } from "drizzle-orm";
import {
  uniqueIndex,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { Coins } from "./coins";

export const Candles = pgTable(
  "candles",
  {
    id: serial("id").notNull(),
    coinId: integer("coin_id")
      .notNull()
      .references(() => Coins.id),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    open: text("open").notNull(),
    high: text("high").notNull(),
    low: text("low").notNull(),
    close: text("close").notNull(),
    volume: text("volume").notNull(),
  },
  (table) => {
    return {
      // Composite index on coinId and timestamp for faster filtering and sorting
      coinIdTimestampIdx: uniqueIndex("coin_id_timestamp_idx").on(
        table.coinId,
        table.timestamp
      ),
      pk: primaryKey({ columns: [table.id, table.timestamp] }),
    };
  }
);

export const CandlesRelations = relations(Candles, ({ one }) => ({
  coin: one(Coins, {
    fields: [Candles.coinId],
    references: [Coins.id],
  }),
}));

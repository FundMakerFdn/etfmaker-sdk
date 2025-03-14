import { relations } from "drizzle-orm";
import {
  pgTable,
  integer,
  serial,
  timestamp,
  text,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { Coins } from "./coins";

export const MarketCap = pgTable(
  "market_cap",
  {
    id: serial("id").notNull(),
    coinId: integer("coin_id")
      .notNull()
      .references(() => Coins.id),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    marketCap: text("market_cap").notNull(),
  },
  (table) => {
    return {
      // Composite index on coinId and timestamp
      coinIdTimestampIdx: uniqueIndex("market_cap_coin_id_timestamp_idx").on(
        table.coinId,
        table.timestamp
      ),
      pk: primaryKey({ columns: [table.id, table.timestamp] }),
    };
  }
);

export const MarketCapRelations = relations(MarketCap, ({ one }) => ({
  coin: one(Coins, {
    fields: [MarketCap.coinId],
    references: [Coins.id],
  }),
}));

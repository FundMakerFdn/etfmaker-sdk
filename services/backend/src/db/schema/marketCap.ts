import { relations } from "drizzle-orm";
import {
  pgTable,
  integer,
  serial,
  timestamp,
  text,
  index,
} from "drizzle-orm/pg-core";
import { Coins } from "./coins";

export const MarketCap = pgTable(
  "market_cap",
  {
    id: serial("id").primaryKey(),
    coinId: integer("coin_id")
      .notNull()
      .references(() => Coins.id),
    timestamp: timestamp("timestamp").notNull(),
    marketCap: text("market_cap").notNull(),
  },
  (table) => {
    return {
      // Composite index on coinId and timestamp
      coinIdTimestampIdx: index("market_cap_coin_id_timestamp_idx").on(
        table.coinId,
        table.timestamp
      ),
    };
  }
);

export const MarketCapRelations = relations(MarketCap, ({ one }) => ({
  coin: one(Coins, {
    fields: [MarketCap.coinId],
    references: [Coins.id],
  }),
}));

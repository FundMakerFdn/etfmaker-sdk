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

export const Funding = pgTable(
  "funding",
  {
    id: serial("id").notNull(),
    coinId: integer("coin_id")
      .notNull()
      .references(() => Coins.id),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    fundingRate: text("funding_rate").notNull(),
  },
  (table) => {
    return {
      // Composite index on coinId and timestamp
      coinIdTimestampIdx: uniqueIndex("funding_coin_id_timestamp_idx").on(
        table.coinId,
        table.timestamp
      ),
      pk: primaryKey({ columns: [table.id, table.timestamp] }),
    };
  }
);

export const FundingRelations = relations(Funding, ({ one }) => ({
  coin: one(Coins, {
    fields: [Funding.coinId],
    references: [Coins.id],
  }),
}));

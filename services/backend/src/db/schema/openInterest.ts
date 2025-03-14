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

export const OpenInterest = pgTable(
  "open_interest",
  {
    id: serial("id").notNull(),
    coinId: integer("coin_id")
      .notNull()
      .references(() => Coins.id),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    sumOpenInterest: text("sum_open_interest").notNull(),
    sumOpenInterestValue: text("sum_open_interest_value").notNull(),
  },
  (table) => {
    return {
      // Composite index on coinId and timestamp
      coinIdTimestampIdx: uniqueIndex("open_interest_coin_id_timestamp_idx").on(
        table.coinId,
        table.timestamp
      ),
      pk: primaryKey({ columns: [table.id, table.timestamp] }),
    };
  }
);

export const OpenInterestRelations = relations(OpenInterest, ({ one }) => ({
  coin: one(Coins, {
    fields: [OpenInterest.coinId],
    references: [Coins.id],
  }),
}));

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

export const OpenInterest = pgTable(
  "open_interest",
  {
    id: serial("id").primaryKey(),
    coinId: integer("coin_id")
      .notNull()
      .references(() => Coins.id),
    timestamp: timestamp("timestamp").notNull(),
    sumOpenInterest: text("sum_open_interest").notNull(),
    sumOpenInterestValue: text("sum_open_interest_value").notNull(),
  },
  (table) => {
    return {
      // Composite index on coinId and timestamp
      coinIdTimestampIdx: index("open_interest_coin_id_timestamp_idx").on(
        table.coinId,
        table.timestamp
      ),
    };
  }
);

export const OpenInterestRelations = relations(OpenInterest, ({ one }) => ({
  coin: one(Coins, {
    fields: [OpenInterest.coinId],
    references: [Coins.id],
  }),
}));

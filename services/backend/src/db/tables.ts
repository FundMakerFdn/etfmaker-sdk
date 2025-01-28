import { relations } from "drizzle-orm";
import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const CoinSourceTableEnum = pgEnum("coin_source_enum", [
  "SPOT",
  "FUTURES",
]);

export const Coins = pgTable("coins", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  assetId: text("asset_id").notNull(),
  source: CoinSourceTableEnum("source").notNull(),
});

export const CoinsRelations = relations(Coins, ({ many }) => ({
  candles: many(Candles),
  openInterest: many(OpenInterest),
  marketCap: many(MarketCap),
}));

export const Candles = pgTable("candles", {
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
});

export const CandlesRelations = relations(Candles, ({ one }) => ({
  coin: one(Coins, {
    fields: [Candles.coinId],
    references: [Coins.id],
  }),
}));

export const OpenInterest = pgTable("open_interest", {
  id: serial("id").primaryKey(),
  coinId: integer("coin_id")
    .notNull()
    .references(() => Coins.id),
  timestamp: timestamp("timestamp").notNull(),
  sumOpenInterest: text("sum_open_interest").notNull(),
  sumOpenInterestValue: text("sum_open_interest_value").notNull(),
});

export const OpenInterestRelations = relations(OpenInterest, ({ one }) => ({
  coin: one(Coins, {
    fields: [OpenInterest.coinId],
    references: [Coins.id],
  }),
}));

export const MarketCap = pgTable("market_cap", {
  id: serial("id").primaryKey(),
  coinId: integer("coin_id")
    .notNull()
    .references(() => Coins.id),
  timestamp: timestamp("timestamp").notNull(),
  marketCap: text("market_cap").notNull(),
});

export const MarketCapRelations = relations(MarketCap, ({ one }) => ({
  coin: one(Coins, {
    fields: [MarketCap.coinId],
    references: [Coins.id],
  }),
}));

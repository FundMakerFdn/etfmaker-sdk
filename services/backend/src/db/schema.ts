import { relations } from "drizzle-orm";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { enumToPgEnum } from "../helpers/EnumToPg";
import { FuturesType } from "../enums/FuturesType.enum";
import { CoinStatusEnum } from "../enums/CoinStatus.enum";
import { CoinSourceEnum } from "../enums/CoinSource.enum";

export const CoinSourceTableEnum = enumToPgEnum(
  "coin_source_enum",
  CoinSourceEnum
);

export const CoinStatusTableEnum = enumToPgEnum(
  "coin_status_enum",
  CoinStatusEnum
);

export const FuturesTypeEnum = enumToPgEnum("futures_type_enum", FuturesType);

export const Coins = pgTable("coins", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  assetId: text("asset_id").notNull(),
  source: CoinSourceTableEnum("source").notNull(),
  pair: text("pair"),
  status: CoinStatusTableEnum("status").notNull(),
  futuresType: FuturesTypeEnum("futures_type"),
});

export const CoinsRelations = relations(Coins, ({ many }) => ({
  candles: many(Candles),
  openInterest: many(OpenInterest),
  marketCap: many(MarketCap),
  funding: many(Funding),
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

export const Funding = pgTable("funding", {
  id: serial("id").primaryKey(),
  coinId: integer("coin_id")
    .notNull()
    .references(() => Coins.id),
  timestamp: timestamp("timestamp").notNull(),
  fundingRate: text("funding_rate").notNull(),
});

export const FundingRelations = relations(Funding, ({ one }) => ({
  coin: one(Coins, {
    fields: [Funding.coinId],
    references: [Coins.id],
  }),
}));

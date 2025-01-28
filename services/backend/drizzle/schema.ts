import {
  pgTable,
  serial,
  integer,
  timestamp,
  text,
  pgEnum,
} from "drizzle-orm/pg-core";

export const coinSourceEnum = pgEnum("coin_source_enum", ["SPOT", "FUTURES"]);

export const candles = pgTable("candles", {
  id: serial().primaryKey().notNull(),
  coinId: integer("coin_id"),
  timestamp: timestamp({ mode: "string" }),
  open: text(),
  high: text(),
  low: text(),
  close: text(),
  volume: text(),
});

export const coins = pgTable("coins", {
  id: serial().primaryKey().notNull(),
  name: text(),
  symbol: text(),
  assetId: text("asset_id"),
  source: coinSourceEnum(),
});

export const marketCap = pgTable("market_cap", {
  id: serial().primaryKey().notNull(),
  coinId: integer("coin_id"),
  timestamp: timestamp({ mode: "string" }),
  marketCap: text("market_cap"),
});

export const openInterest = pgTable("open_interest", {
  id: serial().primaryKey().notNull(),
  coinId: integer("coin_id"),
  timestamp: timestamp({ mode: "string" }),
  sumOpenInterest: text("sum_open_interest"),
  sumOpenInterestValue: text("sum_open_interest_value"),
});

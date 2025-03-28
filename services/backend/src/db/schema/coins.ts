import { relations } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  primaryKey,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { CoinSourceEnum } from "../../enums/CoinSource.enum";
import { CoinStatusEnum } from "../../enums/CoinStatus.enum";
import { FuturesType } from "../../enums/FuturesType.enum";
import { enumToPgEnum } from "../../helpers/EnumToPg";
import { Candles } from "./candles";
import { Funding } from "./funding";
import { MarketCap } from "./marketCap";
import { OpenInterest } from "./openInterest";

export const CoinSourceTableEnum = enumToPgEnum(
  "coin_source_enum",
  CoinSourceEnum
);

export const CoinStatusTableEnum = enumToPgEnum(
  "coin_status_enum",
  CoinStatusEnum
);

export const FuturesTypeEnum = enumToPgEnum("futures_type_enum", FuturesType);

export const Coins = pgTable(
  "coins",
  {
    id: serial("id").notNull(),
    name: text("name").notNull(),
    symbol: text("symbol").notNull(),
    assetId: text("asset_id").notNull(),
    source: CoinSourceTableEnum("source").notNull(),
    pair: text("pair"),
    status: CoinStatusTableEnum("status").notNull(),
    futuresType: FuturesTypeEnum("futures_type"),
    categories: jsonb("categories").default([]),
  },
  (table) => {
    return {
      // Index on symbol for faster lookups
      symbolIdx: index("symbol_idx").on(table.symbol),
      // Index on assetId for faster lookups
      assetIdIdx: index("asset_id_idx").on(table.assetId),
      pk: primaryKey({ columns: [table.id] }),
    };
  }
);

export const CoinsRelations = relations(Coins, ({ many }) => ({
  candles: many(Candles),
  openInterest: many(OpenInterest),
  marketCap: many(MarketCap),
  funding: many(Funding),
}));

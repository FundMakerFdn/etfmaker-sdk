import {
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
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

export const Coins = pgTable(
  "coins",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    symbol: text("symbol").notNull(),
    assetId: text("asset_id").notNull(),
    source: CoinSourceTableEnum("source").notNull(),
    pair: text("pair"),
    status: CoinStatusTableEnum("status").notNull(),
    futuresType: FuturesTypeEnum("futures_type"),
  },
  (table) => {
    return {
      // Index on symbol for faster lookups
      symbolIdx: index("symbol_idx").on(table.symbol),
      // Index on assetId for faster lookups
      assetIdIdx: index("asset_id_idx").on(table.assetId),
    };
  }
);

export const Rebalance = pgTable(
  "rebalance",
  {
    id: serial("id").primaryKey(),
    etfId: text("etf_id").notNull(),
    coinCategory: text("coin_category"),
    timestamp: timestamp("timestamp").notNull(),
    price: text("price").notNull(),
    data: jsonb("data").notNull(),
    spread: text("spread"),
  },
  (table) => {
    return {
      // Composite index on etfId and timestamp
      etfIdTimestampIdx: index("rebalance_etf_id_timestamp_idx").on(
        table.etfId,
        table.timestamp
      ),
    };
  }
);

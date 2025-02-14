import { relations } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  index,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { enumToPgEnum } from "../helpers/EnumToPg";
import { FuturesType } from "../enums/FuturesType.enum";
import { CoinStatusEnum } from "../enums/CoinStatus.enum";
import { CoinSourceEnum } from "../enums/CoinSource.enum";
import {
  ProcessingKeysEnum,
  ProcessingStatusEnum,
} from "../enums/Processing.enum";

export const CoinSourceTableEnum = enumToPgEnum(
  "coin_source_enum",
  CoinSourceEnum
);

export const CoinStatusTableEnum = enumToPgEnum(
  "coin_status_enum",
  CoinStatusEnum
);

export const FuturesTypeEnum = enumToPgEnum("futures_type_enum", FuturesType);

export const ProcessingKeysEnumPg = enumToPgEnum(
  "processing_keys_enum",
  ProcessingKeysEnum
);
export const ProcessingStatusEnumPg = enumToPgEnum(
  "processing_status_enum",
  ProcessingStatusEnum
);

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

export const CoinsRelations = relations(Coins, ({ many }) => ({
  candles: many(Candles),
  openInterest: many(OpenInterest),
  marketCap: many(MarketCap),
  funding: many(Funding),
}));

export const Candles = pgTable(
  "candles",
  {
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
  },
  (table) => {
    return {
      // Composite index on coinId and timestamp for faster filtering and sorting
      coinIdTimestampIdx: index("coin_id_timestamp_idx").on(
        table.coinId,
        table.timestamp
      ),
      // Index on timestamp for sorting
      timestampIdx: index("timestamp_idx").on(table.timestamp),
    };
  }
);

export const CandlesRelations = relations(Candles, ({ one }) => ({
  coin: one(Coins, {
    fields: [Candles.coinId],
    references: [Coins.id],
  }),
}));

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

export const Funding = pgTable(
  "funding",
  {
    id: serial("id").primaryKey(),
    coinId: integer("coin_id")
      .notNull()
      .references(() => Coins.id),
    timestamp: timestamp("timestamp").notNull(),
    fundingRate: text("funding_rate").notNull(),
  },
  (table) => {
    return {
      // Composite index on coinId and timestamp
      coinIdTimestampIdx: index("funding_coin_id_timestamp_idx").on(
        table.coinId,
        table.timestamp
      ),
    };
  }
);

export const FundingRelations = relations(Funding, ({ one }) => ({
  coin: one(Coins, {
    fields: [Funding.coinId],
    references: [Coins.id],
  }),
}));

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

export const EtfPrice = pgTable(
  "etf_price",
  {
    id: serial("id").primaryKey(),
    etfId: text("etf_id").notNull(),
    timestamp: timestamp("timestamp").notNull(),
    open: text("open").notNull(),
    high: text("high").notNull(),
    low: text("low").notNull(),
    close: text("close").notNull(),
  },
  (table) => {
    return {
      // Composite index on etfId and timestamp
      etfIdTimestampIdx: index("etf_price_etf_id_timestamp_idx").on(
        table.etfId,
        table.timestamp
      ),
    };
  }
);

export const EtfFundingReward = pgTable(
  "etf_funding_reward",
  {
    id: serial("id").primaryKey(),
    etfId: text("etf_id").notNull(),
    timestamp: timestamp("timestamp").notNull(),
    reward: text("reward").notNull(),
  },
  (table) => {
    return {
      // Composite index on etfId and timestamp
      etfIdTimestampIdx: index("etf_funding_reward_etf_id_timestamp_idx").on(
        table.etfId,
        table.timestamp
      ),
    };
  }
);

export const ProcessingStatus = pgTable("processing_status", {
  id: serial("id").primaryKey(),
  key: ProcessingKeysEnumPg("key").notNull(),
  status: ProcessingStatusEnumPg("status").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const FundingRewardApy = pgTable(
  "funding_reward_apy",
  {
    id: serial("id").primaryKey(),
    etfId: text("etf_id").notNull(),
    time: integer("time").notNull(),
    value: doublePrecision("value").notNull(),
  },
  (table) => {
    return {
      // Composite index on coinId and timestamp
      coinIdTimestampIdx: index("funding_reward_apy_coin_id_time_idx").on(
        table.time
      ),
      etfIdIdx: index("funding_reward_apy_etf_id_idx").on(table.etfId),
    };
  }
);

export const sUSDeApy = pgTable(
  "susd_apy",
  {
    id: serial("id").primaryKey(),
    etfId: text("etf_id").notNull(),
    time: integer("time").notNull(),
    value: doublePrecision("value").notNull(),
  },
  (table) => {
    return {
      // Composite index on coinId and timestamp
      coinIdTimestampIdx: index("susd_apy_time_idx").on(table.time),
      etfIdIdx: index("susd_apy_etf_id_idx").on(table.etfId),
    };
  }
);

export const BackingSystem = pgTable(
  "backing_system",
  {
    id: serial("id").primaryKey(),
    etfId: text("etf_id").notNull(),
    coinId: integer("coin_id").notNull(),
    time: integer("time").notNull(),
    value: doublePrecision("value").notNull(),
  },
  (table) => {
    return {
      etfIdIdx: index("backing_system_etf_id_idx").on(table.etfId),
      coinIdIdx: index("backing_system_coin_id_idx").on(table.coinId),
    };
  }
);

export const sUSDeSpreadVs3mTreasury = pgTable(
  "susd_spread_vs_3m_treasury",
  {
    id: serial("id").primaryKey(),
    coinId: integer("coin_id").notNull(),
    etfId: text("etf_id").notNull(),
    time: integer("time").notNull(),
    value: doublePrecision("value").notNull(),
  },
  (table) => {
    return {
      timeIdx: index("susd_spread_vs_3m_treasury_time_idx").on(table.time),
      etfIdIdx: index("susd_spread_vs_3m_treasury_etfId_idx").on(table.etfId),
      coinIdIdx: index("susd_spread_vs_3m_treasury_coinId_idx").on(
        table.coinId
      ),
    };
  }
);

export const AverageFundingChartData = pgTable(
  "average_funding_chart_data",
  {
    id: serial("id").primaryKey(),
    etfId: text("etf_id").notNull(),
    coinId: integer("coin_id").notNull(),
    time: integer("time").notNull(),
    value: doublePrecision("value").notNull(),
  },
  (table) => {
    return {
      timeIdx: index("average_funding_chart_data_time_idx").on(table.time),
      coinIdIdx: index("average_funding_chart_data_coinId_idx").on(
        table.coinId
      ),
      etfIdIdx: index("average_funding_chart_data_etfId_idx").on(table.etfId),
    };
  }
);

export const AverageYieldQuartalFundingRewardData = pgTable(
  "average_yield_quartal_funding_reward_data",
  {
    id: serial("id").primaryKey(),
    etfId: text("etf_id").notNull(),
    quarter: integer("time").notNull(),
    avgYield: doublePrecision("value").notNull(),
  },
  (table) => {
    return {
      quarterIdx: index(
        "average_yield_quartal_funding_reward_data_quarter_idx"
      ).on(table.quarter),
      etfIdIdx: index("average_yield_quartal_funding_reward_data_etfId_idx").on(
        table.etfId
      ),
    };
  }
);

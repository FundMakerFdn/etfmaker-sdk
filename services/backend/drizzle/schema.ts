import { pgTable, foreignKey, serial, integer, timestamp, text, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const coinSourceEnum = pgEnum("coin_source_enum", ['SPOT', 'USDMFUTURES', 'COINMFUTURES'])
export const coinStatusEnum = pgEnum("coin_status_enum", ['ACTIVE', 'DELISTED'])
export const futuresTypeEnum = pgEnum("futures_type_enum", ['PERPETUAL', 'CURRENT_QUARTER', 'NEXT_QUARTER', 'DELIVERING'])


export const candles = pgTable("candles", {
	id: serial().primaryKey().notNull(),
	coinId: integer("coin_id").notNull(),
	timestamp: timestamp({ mode: 'string' }).notNull(),
	open: text().notNull(),
	high: text().notNull(),
	low: text().notNull(),
	close: text().notNull(),
	volume: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.coinId],
			foreignColumns: [coins.id],
			name: "candles_coin_id_coins_id_fk"
		}),
]);

export const marketCap = pgTable("market_cap", {
	id: serial().primaryKey().notNull(),
	coinId: integer("coin_id").notNull(),
	timestamp: timestamp({ mode: 'string' }).notNull(),
	marketCap: text("market_cap").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.coinId],
			foreignColumns: [coins.id],
			name: "market_cap_coin_id_coins_id_fk"
		}),
]);

export const openInterest = pgTable("open_interest", {
	id: serial().primaryKey().notNull(),
	coinId: integer("coin_id").notNull(),
	timestamp: timestamp({ mode: 'string' }).notNull(),
	sumOpenInterest: text("sum_open_interest").notNull(),
	sumOpenInterestValue: text("sum_open_interest_value").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.coinId],
			foreignColumns: [coins.id],
			name: "open_interest_coin_id_coins_id_fk"
		}),
]);

export const funding = pgTable("funding", {
	id: serial().primaryKey().notNull(),
	coinId: integer("coin_id").notNull(),
	timestamp: timestamp({ mode: 'string' }).notNull(),
	fundingRate: text("funding_rate").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.coinId],
			foreignColumns: [coins.id],
			name: "funding_coin_id_coins_id_fk"
		}),
]);

export const coins = pgTable("coins", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	symbol: text().notNull(),
	assetId: text("asset_id").notNull(),
	source: coinSourceEnum().notNull(),
	pair: text(),
	status: coinStatusEnum().default('ACTIVE').notNull(),
	futuresType: futuresTypeEnum("futures_type"),
});

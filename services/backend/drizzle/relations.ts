import { relations } from "drizzle-orm/relations";
import { coins, candles, marketCap, openInterest, funding } from "./schema";

export const candlesRelations = relations(candles, ({one}) => ({
	coin: one(coins, {
		fields: [candles.coinId],
		references: [coins.id]
	}),
}));

export const coinsRelations = relations(coins, ({many}) => ({
	candles: many(candles),
	marketCaps: many(marketCap),
	openInterests: many(openInterest),
	fundings: many(funding),
}));

export const marketCapRelations = relations(marketCap, ({one}) => ({
	coin: one(coins, {
		fields: [marketCap.coinId],
		references: [coins.id]
	}),
}));

export const openInterestRelations = relations(openInterest, ({one}) => ({
	coin: one(coins, {
		fields: [openInterest.coinId],
		references: [coins.id]
	}),
}));

export const fundingRelations = relations(funding, ({one}) => ({
	coin: one(coins, {
		fields: [funding.coinId],
		references: [coins.id]
	}),
}));
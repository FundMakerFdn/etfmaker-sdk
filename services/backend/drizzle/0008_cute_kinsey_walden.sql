CREATE TYPE "public"."processing_keys_enum" AS ENUM('actualizing', 'processing');--> statement-breakpoint
CREATE TYPE "public"."processing_status_enum" AS ENUM('processing', 'success', 'error');--> statement-breakpoint
CREATE TABLE "processing_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" "processing_keys_enum" NOT NULL,
	"status" "processing_status_enum" NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rebalance" ADD COLUMN "coin_category" text;--> statement-breakpoint
CREATE INDEX "coin_id_timestamp_idx" ON "candles" USING btree ("coin_id","timestamp");--> statement-breakpoint
CREATE INDEX "timestamp_idx" ON "candles" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "symbol_idx" ON "coins" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "asset_id_idx" ON "coins" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "etf_funding_reward_etf_id_timestamp_idx" ON "etf_funding_reward" USING btree ("etf_id","timestamp");--> statement-breakpoint
CREATE INDEX "etf_price_etf_id_timestamp_idx" ON "etf_price" USING btree ("etf_id","timestamp");--> statement-breakpoint
CREATE INDEX "funding_coin_id_timestamp_idx" ON "funding" USING btree ("coin_id","timestamp");--> statement-breakpoint
CREATE INDEX "market_cap_coin_id_timestamp_idx" ON "market_cap" USING btree ("coin_id","timestamp");--> statement-breakpoint
CREATE INDEX "open_interest_coin_id_timestamp_idx" ON "open_interest" USING btree ("coin_id","timestamp");--> statement-breakpoint
CREATE INDEX "rebalance_etf_id_timestamp_idx" ON "rebalance" USING btree ("etf_id","timestamp");
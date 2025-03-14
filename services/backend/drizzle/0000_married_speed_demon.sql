CREATE TYPE "public"."coin_source_enum" AS ENUM('SPOT', 'USDMFUTURES');--> statement-breakpoint
CREATE TYPE "public"."coin_status_enum" AS ENUM('ACTIVE', 'DELISTED');--> statement-breakpoint
CREATE TYPE "public"."futures_type_enum" AS ENUM('PERPETUAL', 'CURRENT_QUARTER', 'NEXT_QUARTER', 'DELIVERING');--> statement-breakpoint
CREATE TYPE "public"."processing_status_enum" AS ENUM('processing', 'success', 'error');--> statement-breakpoint
CREATE TABLE "average_funding_chart_data" (
	"id" serial NOT NULL,
	"etf_id" text NOT NULL,
	"coin_id" integer NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"value" double precision NOT NULL,
	CONSTRAINT "average_funding_chart_data_id_timestamp_pk" PRIMARY KEY("id","timestamp")
);
--> statement-breakpoint
CREATE TABLE "candles" (
	"id" serial NOT NULL,
	"coin_id" integer NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"open" text NOT NULL,
	"high" text NOT NULL,
	"low" text NOT NULL,
	"close" text NOT NULL,
	"volume" text NOT NULL,
	CONSTRAINT "candles_id_timestamp_pk" PRIMARY KEY("id","timestamp")
);
--> statement-breakpoint
CREATE TABLE "coins" (
	"id" serial NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"asset_id" text NOT NULL,
	"source" "coin_source_enum" NOT NULL,
	"pair" text,
	"status" "coin_status_enum" NOT NULL,
	"futures_type" "futures_type_enum",
	CONSTRAINT "coins_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE TABLE "etf_funding_reward" (
	"id" serial NOT NULL,
	"etf_id" text NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"reward" text NOT NULL,
	CONSTRAINT "etf_funding_reward_id_timestamp_pk" PRIMARY KEY("id","timestamp")
);
--> statement-breakpoint
CREATE TABLE "etf_price" (
	"id" serial NOT NULL,
	"etf_id" text NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"open" text NOT NULL,
	"high" text NOT NULL,
	"low" text NOT NULL,
	"close" text NOT NULL,
	CONSTRAINT "etf_price_id_timestamp_pk" PRIMARY KEY("id","timestamp")
);
--> statement-breakpoint
CREATE TABLE "funding" (
	"id" serial NOT NULL,
	"coin_id" integer NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"funding_rate" text NOT NULL,
	CONSTRAINT "funding_id_timestamp_pk" PRIMARY KEY("id","timestamp")
);
--> statement-breakpoint
CREATE TABLE "funding_reward_apy" (
	"id" serial NOT NULL,
	"etf_id" text NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"value" double precision NOT NULL,
	CONSTRAINT "funding_reward_apy_id_timestamp_pk" PRIMARY KEY("id","timestamp")
);
--> statement-breakpoint
CREATE TABLE "market_cap" (
	"id" serial NOT NULL,
	"coin_id" integer NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"market_cap" text NOT NULL,
	CONSTRAINT "market_cap_id_timestamp_pk" PRIMARY KEY("id","timestamp")
);
--> statement-breakpoint
CREATE TABLE "open_interest" (
	"id" serial NOT NULL,
	"coin_id" integer NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"sum_open_interest" text NOT NULL,
	"sum_open_interest_value" text NOT NULL,
	CONSTRAINT "open_interest_id_timestamp_pk" PRIMARY KEY("id","timestamp")
);
--> statement-breakpoint
CREATE TABLE "processing_status" (
	"id" serial NOT NULL,
	"key" text NOT NULL,
	"status" "processing_status_enum" NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "processing_status_id_timestamp_pk" PRIMARY KEY("id","timestamp")
);
--> statement-breakpoint
CREATE TABLE "rebalance" (
	"id" serial NOT NULL,
	"etf_id" text NOT NULL,
	"coin_category" text,
	"timestamp" timestamp with time zone NOT NULL,
	"price" text NOT NULL,
	"data" jsonb NOT NULL,
	"spread" text,
	CONSTRAINT "rebalance_id_timestamp_pk" PRIMARY KEY("id","timestamp")
);
--> statement-breakpoint
CREATE TABLE "susd_apy" (
	"id" serial NOT NULL,
	"etf_id" text NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"value" double precision NOT NULL,
	CONSTRAINT "susd_apy_id_timestamp_pk" PRIMARY KEY("id","timestamp")
);
--> statement-breakpoint
CREATE TABLE "susd_spread_vs_3m_treasury" (
	"id" serial NOT NULL,
	"coin_id" integer NOT NULL,
	"etf_id" text NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"value" double precision NOT NULL,
	CONSTRAINT "susd_spread_vs_3m_treasury_id_timestamp_pk" PRIMARY KEY("id","timestamp")
);
--> statement-breakpoint
ALTER TABLE "candles" ADD CONSTRAINT "candles_coin_id_coins_id_fk" FOREIGN KEY ("coin_id") REFERENCES "public"."coins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding" ADD CONSTRAINT "funding_coin_id_coins_id_fk" FOREIGN KEY ("coin_id") REFERENCES "public"."coins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_cap" ADD CONSTRAINT "market_cap_coin_id_coins_id_fk" FOREIGN KEY ("coin_id") REFERENCES "public"."coins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_interest" ADD CONSTRAINT "open_interest_coin_id_coins_id_fk" FOREIGN KEY ("coin_id") REFERENCES "public"."coins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "average_funding_chart_data_coinId_idx" ON "average_funding_chart_data" USING btree ("coin_id","timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "average_funding_chart_data_etfId_idx" ON "average_funding_chart_data" USING btree ("etf_id","timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "coin_id_timestamp_idx" ON "candles" USING btree ("coin_id","timestamp");--> statement-breakpoint
CREATE INDEX "symbol_idx" ON "coins" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "asset_id_idx" ON "coins" USING btree ("asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "etf_funding_reward_etf_id_timestamp_idx" ON "etf_funding_reward" USING btree ("etf_id","timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "etf_price_etf_id_timestamp_idx" ON "etf_price" USING btree ("etf_id","timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "funding_coin_id_timestamp_idx" ON "funding" USING btree ("coin_id","timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "funding_reward_apy_etf_id_idx" ON "funding_reward_apy" USING btree ("etf_id","timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "market_cap_coin_id_timestamp_idx" ON "market_cap" USING btree ("coin_id","timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "open_interest_coin_id_timestamp_idx" ON "open_interest" USING btree ("coin_id","timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "rebalance_etf_id_timestamp_idx" ON "rebalance" USING btree ("etf_id","timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "susd_apy_etf_id_idx" ON "susd_apy" USING btree ("etf_id","timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "susd_spread_vs_3m_treasury_etfId_idx" ON "susd_spread_vs_3m_treasury" USING btree ("etf_id","timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "susd_spread_vs_3m_treasury_coinId_idx" ON "susd_spread_vs_3m_treasury" USING btree ("coin_id","timestamp");
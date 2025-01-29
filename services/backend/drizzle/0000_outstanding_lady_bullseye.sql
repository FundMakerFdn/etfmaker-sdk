CREATE TYPE "public"."coin_source_enum" AS ENUM('SPOT', 'USDMFUTURES', 'COINMFUTURES');--> statement-breakpoint
CREATE TABLE "candles" (
	"id" serial PRIMARY KEY NOT NULL,
	"coin_id" integer NOT NULL,
	"timestamp" timestamp NOT NULL,
	"open" text NOT NULL,
	"high" text NOT NULL,
	"low" text NOT NULL,
	"close" text NOT NULL,
	"volume" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coins" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"asset_id" text NOT NULL,
	"source" "coin_source_enum" NOT NULL,
	"pair" text
);
--> statement-breakpoint
CREATE TABLE "market_cap" (
	"id" serial PRIMARY KEY NOT NULL,
	"coin_id" integer NOT NULL,
	"timestamp" timestamp NOT NULL,
	"market_cap" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "open_interest" (
	"id" serial PRIMARY KEY NOT NULL,
	"coin_id" integer NOT NULL,
	"timestamp" timestamp NOT NULL,
	"sum_open_interest" text NOT NULL,
	"sum_open_interest_value" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candles" ADD CONSTRAINT "candles_coin_id_coins_id_fk" FOREIGN KEY ("coin_id") REFERENCES "public"."coins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_cap" ADD CONSTRAINT "market_cap_coin_id_coins_id_fk" FOREIGN KEY ("coin_id") REFERENCES "public"."coins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_interest" ADD CONSTRAINT "open_interest_coin_id_coins_id_fk" FOREIGN KEY ("coin_id") REFERENCES "public"."coins"("id") ON DELETE no action ON UPDATE no action;
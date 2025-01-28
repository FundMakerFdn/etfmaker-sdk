CREATE TYPE "public"."coin_source_enum" AS ENUM('SPOT', 'FUTURES');--> statement-breakpoint
CREATE TABLE "candles" (
	"id" serial PRIMARY KEY NOT NULL,
	"coin_id" integer,
	"timestamp" timestamp,
	"open" text,
	"high" text,
	"low" text,
	"close" text,
	"volume" text
);
--> statement-breakpoint
CREATE TABLE "coins" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"symbol" text,
	"asset_id" text,
	"source" "coin_source_enum"
);
--> statement-breakpoint
CREATE TABLE "market_cap" (
	"id" serial PRIMARY KEY NOT NULL,
	"coin_id" integer,
	"timestamp" timestamp,
	"market_cap" text
);
--> statement-breakpoint
CREATE TABLE "open_interest" (
	"id" serial PRIMARY KEY NOT NULL,
	"coin_id" integer,
	"timestamp" timestamp,
	"sum_open_interest" text,
	"sum_open_interest_value" text
);

CREATE TABLE "etf_funding_reward" (
	"id" serial PRIMARY KEY NOT NULL,
	"etf_id" integer NOT NULL,
	"timestamp" timestamp NOT NULL,
	"reward" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "etf_price" (
	"id" serial PRIMARY KEY NOT NULL,
	"etf_id" integer NOT NULL,
	"timestamp" timestamp NOT NULL,
	"open" text NOT NULL,
	"high" text NOT NULL,
	"low" text NOT NULL,
	"close" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rebalance" (
	"id" serial PRIMARY KEY NOT NULL,
	"etf_id" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	"price" text NOT NULL,
	"data" jsonb NOT NULL
);

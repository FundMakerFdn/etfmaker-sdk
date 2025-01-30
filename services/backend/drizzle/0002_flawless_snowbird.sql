CREATE TABLE "funding" (
	"id" serial PRIMARY KEY NOT NULL,
	"coin_id" integer NOT NULL,
	"timestamp" timestamp NOT NULL,
	"funding_rate" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "funding" ADD CONSTRAINT "funding_coin_id_coins_id_fk" FOREIGN KEY ("coin_id") REFERENCES "public"."coins"("id") ON DELETE no action ON UPDATE no action;
CREATE TABLE "average_funding_chart_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"etf_id" text NOT NULL,
	"coin_id" integer NOT NULL,
	"time" integer NOT NULL,
	"value" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "average_yield_quartal_funding_reward_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"etf_id" text NOT NULL,
	"time" integer NOT NULL,
	"value" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backing_system" (
	"id" serial PRIMARY KEY NOT NULL,
	"etf_id" text NOT NULL,
	"coin_id" integer NOT NULL,
	"time" integer NOT NULL,
	"value" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funding_reward_apy" (
	"id" serial PRIMARY KEY NOT NULL,
	"etf_id" text NOT NULL,
	"time" integer NOT NULL,
	"value" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "susd_apy" (
	"id" serial PRIMARY KEY NOT NULL,
	"etf_id" text NOT NULL,
	"time" integer NOT NULL,
	"value" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "susd_spread_vs_3m_treasury" (
	"id" serial PRIMARY KEY NOT NULL,
	"coin_id" integer NOT NULL,
	"etf_id" text NOT NULL,
	"time" integer NOT NULL,
	"value" integer NOT NULL
);

CREATE INDEX "average_funding_chart_data_time_idx" ON "average_funding_chart_data" USING btree ("time");--> statement-breakpoint
CREATE INDEX "average_funding_chart_data_coinId_idx" ON "average_funding_chart_data" USING btree ("coin_id");--> statement-breakpoint
CREATE INDEX "average_funding_chart_data_etfId_idx" ON "average_funding_chart_data" USING btree ("etf_id");--> statement-breakpoint
CREATE INDEX "average_yield_quartal_funding_reward_data_quarter_idx" ON "average_yield_quartal_funding_reward_data" USING btree ("time");--> statement-breakpoint
CREATE INDEX "average_yield_quartal_funding_reward_data_etfId_idx" ON "average_yield_quartal_funding_reward_data" USING btree ("etf_id");--> statement-breakpoint
CREATE INDEX "backing_system_etf_id_idx" ON "backing_system" USING btree ("etf_id");--> statement-breakpoint
CREATE INDEX "backing_system_coin_id_idx" ON "backing_system" USING btree ("coin_id");--> statement-breakpoint
CREATE INDEX "funding_reward_apy_coin_id_time_idx" ON "funding_reward_apy" USING btree ("time");--> statement-breakpoint
CREATE INDEX "funding_reward_apy_etf_id_idx" ON "funding_reward_apy" USING btree ("etf_id");--> statement-breakpoint
CREATE INDEX "susd_apy_time_idx" ON "susd_apy" USING btree ("time");--> statement-breakpoint
CREATE INDEX "susd_apy_etf_id_idx" ON "susd_apy" USING btree ("etf_id");--> statement-breakpoint
CREATE INDEX "susd_spread_vs_3m_treasury_time_idx" ON "susd_spread_vs_3m_treasury" USING btree ("time");--> statement-breakpoint
CREATE INDEX "susd_spread_vs_3m_treasury_etfId_idx" ON "susd_spread_vs_3m_treasury" USING btree ("etf_id");--> statement-breakpoint
CREATE INDEX "susd_spread_vs_3m_treasury_coinId_idx" ON "susd_spread_vs_3m_treasury" USING btree ("coin_id");
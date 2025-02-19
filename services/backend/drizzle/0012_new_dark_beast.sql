ALTER TABLE "average_yield_quartal_funding_reward_data" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "backing_system" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "average_yield_quartal_funding_reward_data" CASCADE;--> statement-breakpoint
DROP TABLE "backing_system" CASCADE;--> statement-breakpoint
DROP INDEX "average_funding_chart_data_time_idx";--> statement-breakpoint
DROP INDEX "funding_reward_apy_coin_id_time_idx";--> statement-breakpoint
DROP INDEX "susd_apy_time_idx";--> statement-breakpoint
DROP INDEX "susd_spread_vs_3m_treasury_time_idx";--> statement-breakpoint
ALTER TABLE "average_funding_chart_data" ADD COLUMN "timestamp" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "funding_reward_apy" ADD COLUMN "timestamp" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "susd_apy" ADD COLUMN "timestamp" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "susd_spread_vs_3m_treasury" ADD COLUMN "timestamp" timestamp NOT NULL;--> statement-breakpoint
CREATE INDEX "average_funding_chart_data_time_idx" ON "average_funding_chart_data" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "funding_reward_apy_coin_id_time_idx" ON "funding_reward_apy" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "susd_apy_time_idx" ON "susd_apy" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "susd_spread_vs_3m_treasury_time_idx" ON "susd_spread_vs_3m_treasury" USING btree ("timestamp");--> statement-breakpoint
ALTER TABLE "average_funding_chart_data" DROP COLUMN "time";--> statement-breakpoint
ALTER TABLE "funding_reward_apy" DROP COLUMN "time";--> statement-breakpoint
ALTER TABLE "susd_apy" DROP COLUMN "time";--> statement-breakpoint
ALTER TABLE "susd_spread_vs_3m_treasury" DROP COLUMN "time";
DROP INDEX "etf_funding_reward_etf_id_timestamp_idx";--> statement-breakpoint
CREATE INDEX "etf_funding_reward_etf_id_timestamp_idx" ON "etf_funding_reward" USING btree ("etf_id","timestamp");
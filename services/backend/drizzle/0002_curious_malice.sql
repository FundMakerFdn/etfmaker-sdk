DROP INDEX "average_funding_chart_data_coinId_idx";--> statement-breakpoint
DROP INDEX "average_funding_chart_data_etfId_idx";--> statement-breakpoint
CREATE INDEX "average_funding_chart_data_coinId_idx" ON "average_funding_chart_data" USING btree ("coin_id","timestamp");--> statement-breakpoint
CREATE INDEX "average_funding_chart_data_etfId_idx" ON "average_funding_chart_data" USING btree ("etf_id","timestamp");
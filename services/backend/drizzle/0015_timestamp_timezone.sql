-- For the candles table:
ALTER TABLE candles
  ALTER COLUMN "timestamp" TYPE TIMESTAMPTZ USING "timestamp" AT TIME ZONE 'UTC';

-- For the market_cap table:
ALTER TABLE market_cap
  ALTER COLUMN "timestamp" TYPE TIMESTAMPTZ USING "timestamp" AT TIME ZONE 'UTC';

-- For the open_interest table:
ALTER TABLE open_interest
  ALTER COLUMN "timestamp" TYPE TIMESTAMPTZ USING "timestamp" AT TIME ZONE 'UTC';

-- For the funding table:
ALTER TABLE funding
  ALTER COLUMN "timestamp" TYPE TIMESTAMPTZ USING "timestamp" AT TIME ZONE 'UTC';

-- For the rebalance table:
ALTER TABLE rebalance
  ALTER COLUMN "timestamp" TYPE TIMESTAMPTZ USING "timestamp" AT TIME ZONE 'UTC';

-- For the etf_funding_reward table:
ALTER TABLE etf_funding_reward
  ALTER COLUMN "timestamp" TYPE TIMESTAMPTZ USING "timestamp" AT TIME ZONE 'UTC';

-- For the processing_status table:
ALTER TABLE processing_status
  ALTER COLUMN "timestamp" TYPE TIMESTAMPTZ USING "timestamp" AT TIME ZONE 'UTC';

-- For the funding_reward_apy table:
ALTER TABLE funding_reward_apy
  ALTER COLUMN "timestamp" TYPE TIMESTAMPTZ USING "timestamp" AT TIME ZONE 'UTC';

-- For the susd_apy table:
ALTER TABLE susd_apy
  ALTER COLUMN "timestamp" TYPE TIMESTAMPTZ USING "timestamp" AT TIME ZONE 'UTC';

-- For the susd_spread_vs_3m_treasury table:
ALTER TABLE susd_spread_vs_3m_treasury
  ALTER COLUMN "timestamp" TYPE TIMESTAMPTZ USING "timestamp" AT TIME ZONE 'UTC';

-- For the average_funding_chart_data table:
ALTER TABLE average_funding_chart_data
  ALTER COLUMN "timestamp" TYPE TIMESTAMPTZ USING "timestamp" AT TIME ZONE 'UTC';

-- For the etf_price table (if applicable):
ALTER TABLE etf_price
  ALTER COLUMN "timestamp" TYPE TIMESTAMPTZ USING "timestamp" AT TIME ZONE 'UTC';

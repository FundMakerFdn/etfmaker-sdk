CREATE EXTENSION IF NOT EXISTS timescaledb;

SELECT create_hypertable('candles', 'timestamp');
SELECT create_hypertable('market_cap', 'timestamp');
SELECT create_hypertable('open_interest', 'timestamp');
SELECT create_hypertable('rebalance', 'timestamp');
SELECT create_hypertable('etf_funding_reward', 'timestamp');
SELECT create_hypertable('processing_status', 'timestamp');
SELECT create_hypertable('funding_reward_apy', 'timestamp');
SELECT create_hypertable('susd_apy', 'timestamp');
SELECT create_hypertable('susd_spread_vs_3m_treasury', 'timestamp');
SELECT create_hypertable('average_funding_chart_data', 'timestamp');
SELECT create_hypertable('etf_price', 'timestamp');

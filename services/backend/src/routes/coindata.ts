import {
  calculateCoinData,
  generateEtfFundingRewardData,
  generateETFPriceData,
  generateRebalanceData,
  getAPYFundingRate,
  getAverageFundingChartData,
  getAverageYieldQuartalFundingRewardData,
  getBackingSystem,
  getETFPrices,
  getFundingDaysDistribution,
  getRebalanceDataCsv,
  getSimulatedRebalanceDataCsv,
  getSUSDeApy,
  getSUSDeSpreadVs3mTreasury,
} from "../coindata/data.controller";
import { RoutesType } from "../interfaces/RoutesType";

export const CoinDataRoutes = [
  {
    method: "POST",
    url: "/calculate-coindata",
    handler: calculateCoinData,
  },
  {
    method: "POST",
    url: "/generate-rebalance-data",
    handler: generateRebalanceData,
  },
  {
    method: "POST",
    url: "/generate-etf-price-data",
    handler: generateETFPriceData,
  },
  {
    method: "POST",
    url: "/generate-etf-funding-reward-data",
    handler: generateEtfFundingRewardData,
  },
  {
    method: "GET",
    url: "/get-etf-prices",
    handler: getETFPrices,
  },
  {
    method: "GET",
    url: "/get-apy-funding-rate",
    handler: getAPYFundingRate,
  },
  {
    method: "GET",
    url: "/get-susd-apy",
    handler: getSUSDeApy,
  },
  {
    method: "GET",
    url: "/get-backing-system",
    handler: getBackingSystem,
  },
  {
    method: "GET",
    url: "/get-rebalance-data-csv",
    handler: getRebalanceDataCsv,
  },
  {
    method: "GET",
    url: "/get-simulated-rebalance-data-csv",
    handler: getSimulatedRebalanceDataCsv,
  },
  {
    method: "GET",
    url: "/get-average-funding-chart-data",
    handler: getAverageFundingChartData,
  },
  {
    method: "GET",
    url: "/get-average-yield-quartal-funding-reward-data",
    handler: getAverageYieldQuartalFundingRewardData,
  },
  {
    method: "GET",
    url: "/get-funding-days-distribution",
    handler: getFundingDaysDistribution,
  },
  {
    method: "GET",
    url: "/get-susd-spread-vs-3m-treasury",
    handler: getSUSDeSpreadVs3mTreasury,
  },
] satisfies RoutesType[];

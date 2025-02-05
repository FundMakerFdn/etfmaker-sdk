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
  getRebalanceDataCsv,
  getSUSDeApy,
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
    url: "/get-average-funding-chart-data",
    handler: getAverageFundingChartData,
  },
  {
    method: "GET",
    url: "/get-average-yield-quartal-funding-reward-data",
    handler: getAverageYieldQuartalFundingRewardData,
  },
] satisfies RoutesType[];

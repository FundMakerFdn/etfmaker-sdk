import {
  actualizeCoinData,
  generateEtfFundingRewardData,
  generateETFPriceData,
  generateRebalanceData,
  getAPYFundingRate,
  getAverageFundingChartData,
  getAverageYieldQuartalFundingData,
  getBackingSystem,
  getCoinOHCL,
  getETFPrices,
  getFundingDaysDistribution,
  getRebalanceAssets,
  getRebalanceDataCsv,
  getSimulatedRebalanceDataCsv,
  getSUSDeApy,
  getSUSDeSpreadVs3mTreasury,
} from "../coindata/data.controller";
import { RoutesType } from "../interfaces/RoutesType";

export const CoinDataRoutes = [
  {
    method: "POST",
    url: "/actualize-coindata",
    handler: actualizeCoinData,
  },
  {
    method: "GET",
    url: "/get-rebalance-assets",
    handler: getRebalanceAssets,
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
    url: "/get-coin-ohcl",
    handler: getCoinOHCL,
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
    handler: getAverageYieldQuartalFundingData,
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

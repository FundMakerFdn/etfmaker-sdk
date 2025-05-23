import {
  getAllSpotUsdtPairs,
  getAPYFundingRate,
  getAverageFundingChartData,
  getAverageYieldQuartalFundingData,
  getBackingSystem,
  getCoinOHCL,
  getFundingDaysDistribution,
  getSUSDeApy,
  getSUSDeSpreadVs3mTreasury,
} from "../coindata/data.controller";
import { RoutesType } from "../interfaces/RoutesType";

export const CoinDataRoutes = [
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
  {
    method: "GET",
    url: "/get-all-spot-usdt-pairs",
    handler: getAllSpotUsdtPairs,
  },
] satisfies RoutesType[];

import {
  calculateCoinData,
  generateEtfFundingRewardData,
  generateETFPriceData,
  generateRebalanceData,
  getAPYFundingRate,
  getETFPrices,
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
] satisfies RoutesType[];

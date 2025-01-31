import {
  calculateCoinData,
  getCoinsPrices,
  getRecentCoinData,
  getTopCoinsByMarketCap,
} from "../coindata/data.controller";
import { RoutesType } from "../interfaces/RoutesType";

export const CoinDataRoutes = [
  {
    method: "POST",
    url: "/calculate-coindata",
    handler: calculateCoinData,
  },
  {
    method: "GET",
    url: "/get-recent-coindata",
    handler: getRecentCoinData,
  },
  {
    method: "GET",
    url: "/get-top-coins-by-marketcap",
    handler: getTopCoinsByMarketCap,
  },
  {
    method: "POST",
    url: "/get-coins-prices",
    handler: getCoinsPrices,
  },
] satisfies RoutesType[];

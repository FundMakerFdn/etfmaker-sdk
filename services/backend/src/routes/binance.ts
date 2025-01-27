import {
  getAllHistoricalCandles,
  getAllOpenInterest,
  getBinanceFutureTokens,
  getFundingRates,
} from "../binance/binance.controller";

import { RoutesType } from "../interfaces/RoutesType";

export const BinanceRoutes = [
  {
    method: "GET",
    url: "/get-binance-future-tokens",
    handler: getBinanceFutureTokens,
  },
  {
    method: "GET",
    url: "/get-binance-historical-candles",
    handler: getAllHistoricalCandles,
  },
  {
    method: "GET",
    url: "/get-binance-funding-rates",
    handler: getFundingRates,
  },
  {
    method: "GET",
    url: "/get-binance-open-interest",
    handler: getAllOpenInterest,
  },
] satisfies RoutesType[];

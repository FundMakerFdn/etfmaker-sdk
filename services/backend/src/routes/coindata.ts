import {
  calculateCoinData,
  updateCandles,
} from "../coindata/coindata.controller";
import { RoutesType } from "../interfaces/RoutesType";

export const CoinDataRoutes = [
  {
    method: "POST",
    url: "/calculate-coindata",
    handler: calculateCoinData,
  },
  {
    method: "POST",
    url: "/update-candles",
    handler: updateCandles,
  },
] satisfies RoutesType[];

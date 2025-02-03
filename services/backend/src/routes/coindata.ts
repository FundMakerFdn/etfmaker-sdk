import {
  calculateCoinData,
  generateRebalanceData,
  getCloseETFPrice,
  getCoinsPrices,
  getRecentCoinData,
  getTopCoinsByMarketCap,
  setAmountPerContracts,
  setAssetWeights,
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
  {
    method: "POST",
    url: "/set-asset-weights",
    handler: setAssetWeights,
  },
  {
    method: "POST",
    url: "/set-amount-per-contracts",
    handler: setAmountPerContracts,
  },
  {
    method: "POST",
    url: "/get-close-etf-prices",
    handler: getCloseETFPrice,
  },
  {
    method: "POST",
    url: "/generate-rebalance-data",
    handler: generateRebalanceData,
  },
] satisfies RoutesType[];

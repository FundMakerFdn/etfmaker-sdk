import {
  CoinGeckoCoinList,
  CoinGeckoPing,
  updateCoinGeckoDbTable,
} from "../coingecko/coingecko.controller";
import { RoutesType } from "../interfaces/RoutesType";

export const CoinGeckoRoutes = [
  {
    method: "GET",
    url: "/ping",
    handler: CoinGeckoPing,
  },
  {
    method: "GET",
    url: "/coin-list",
    handler: CoinGeckoCoinList,
  },
  {
    method: "POST",
    url: "/update-coin-gecko-db-list",
    handler: updateCoinGeckoDbTable,
  },
] satisfies RoutesType[];

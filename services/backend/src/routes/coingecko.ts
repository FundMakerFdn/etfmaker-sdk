import {
  CoinCategoryList,
  CoinGeckoCoinList,
  CoinGeckoPing,
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
    method: "GET",
    url: "/coin-categories",
    handler: CoinCategoryList,
  },
] satisfies RoutesType[];

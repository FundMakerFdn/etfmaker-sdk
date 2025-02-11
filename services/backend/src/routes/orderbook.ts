import { streamOrderBook } from "../orderbook/orderbook.controller";
import { RoutesType } from "../interfaces/RoutesType";

export const OrderbookRoutes = [
  {
    method: "GET",
    url: "/order-book",
    handler: () => {
      console.log("It's websocket route");
      return "It's websocket route";
    },
    websocket: true,
    wsHandler: streamOrderBook,
  },
] satisfies RoutesType[];

import { streamOrderBook } from "../orderbook/orderbook.controller";
import { RoutesType } from "../interfaces/RoutesType";
import { WebSocket } from "@fastify/websocket";
import { FastifyReply, FastifyRequest } from "fastify";

export const OrderbookRoutes = [
  {
    method: "GET",
    url: "/order-book",
    handler: (request: FastifyRequest, reply: FastifyReply) => {
      // This handler is for HTTP GET requests
      reply.send("This endpoint supports WebSocket connections only.");
    },
    wsHandler: (connection: WebSocket, request: FastifyRequest) => {
      streamOrderBook(connection, request);
    },
  },
] satisfies RoutesType[];

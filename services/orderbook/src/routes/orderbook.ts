import {
  streamEtfWeightedSpread,
  streamOrderBook,
} from "../orderbook/orderbook.controller";
import { RoutesType } from "../interfaces/RoutesType";
import { WebSocket } from "@fastify/websocket";
import { FastifyReply, FastifyRequest } from "fastify";
import { RebalanceConfig } from "../interfaces/RebalanceConfig.interface";

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
  {
    method: "GET",
    url: "/etf-weighted-spread",
    handler: (request: FastifyRequest, reply: FastifyReply) => {
      // This handler is for HTTP GET requests
      reply.send("This endpoint supports WebSocket connections only.");
    },
    wsHandler: (connection: WebSocket, request: FastifyRequest) => {
      const query = request.query as { etfId: RebalanceConfig["etfId"] };

      if (!query?.etfId) {
        connection.send(
          JSON.stringify({
            error: "etfId query parameter is required.",
          })
        );
        return;
      }

      streamEtfWeightedSpread(connection, query.etfId);
    },
  },
] satisfies RoutesType[];

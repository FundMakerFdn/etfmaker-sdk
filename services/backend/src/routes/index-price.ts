import { FastifyRequest, FastifyReply } from "fastify";
import {
  generateEtfFundingRewardData,
  generateETFPriceData,
  getETFPrices,
  getAvailableteIndexEtfIds,
  streamIndexPriceUpdates,
  getIndexTableList,
} from "../index-price/index-price.controller";
import { RoutesType } from "../interfaces/RoutesType";
import { WebSocket } from "ws";

export const IndexPriceRoutes = [
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
    url: "/get-index-ids",
    handler: getAvailableteIndexEtfIds,
  },
  {
    method: "GET",
    url: "/get-index-table-list",
    handler: getIndexTableList,
  },
  {
    method: "GET",
    url: "/etf-price-stream",
    handler: (_request: FastifyRequest, reply: FastifyReply) => {
      // This handler is for HTTP GET requests
      reply.send("This endpoint supports WebSocket connections only.");
    },
    wsHandler: (connection: WebSocket, request: FastifyRequest) => {
      streamIndexPriceUpdates(connection, request);
    },
  },
] satisfies RoutesType[];

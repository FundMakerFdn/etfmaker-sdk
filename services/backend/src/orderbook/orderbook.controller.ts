import { FastifyRequest } from "fastify";
import WebSocket from "ws";
import orderBookConsumerService from "./consumers/orderbook";
import etfWeightedSpreadConsumer from "./consumers/etfWeightedSpread";

export const streamOrderBook = async (
  socket: WebSocket,
  request: FastifyRequest
) => {
  const coinId = Number((request.query as { coinId: string }).coinId);

  if (!coinId || isNaN(coinId)) {
    socket.close();
    return;
  }

  orderBookConsumerService.setOrderBookByCoinClient(socket, coinId);
};

export const streamEtfWeightedSpread = async (socket: WebSocket) => {
  etfWeightedSpreadConsumer.setEtfWeightedClient(socket);
};

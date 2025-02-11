import { FastifyRequest } from "fastify";
import WebSocket from "ws";
import orderBookConsumerService from "./orderbook.consumer.service";

export const streamOrderBook = async (
  socket: WebSocket,
  request: FastifyRequest
) => {
  const symbol = (request.query as { symbol: string }).symbol.toUpperCase();
  console.log(`Client subscribed: ${symbol}`);

  // orderBookConsumerService.setClient(socket, symbol);
};

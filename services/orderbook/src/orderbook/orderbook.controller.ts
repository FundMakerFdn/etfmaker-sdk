import { FastifyRequest } from "fastify";
import WebSocket from "ws";
import orderBookConsumerService from "./consumers/orderbook";
import { EtfWeightedSpreadConsumer } from "./consumers/etfWeightedSpread";
import { RebalanceConfig } from "../interfaces/RebalanceConfig.interface";

export const streamOrderBook = async (
  socket: WebSocket,
  request: FastifyRequest
) => {
  const coinId = Number((request.query as { coinId: string }).coinId);
  console.log("COIN ID", coinId);

  if (!coinId || isNaN(coinId)) {
    socket.close();
    return;
  }

  orderBookConsumerService.setOrderBookByCoinClient(socket, coinId);
};

export const streamEtfWeightedSpread = async (
  socket: WebSocket,
  etfId: RebalanceConfig["etfId"]
) => {
  const etfWeightedSpreadConsumer = new EtfWeightedSpreadConsumer(etfId);
  etfWeightedSpreadConsumer.setEtfWeightedClient(socket);
};

import { FastifyReply, FastifyRequest } from "fastify";
import { CoinGeckoService } from "./coingecko.service";

const coinGeckoService = new CoinGeckoService();

export const CoinGeckoPing = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  coinGeckoService.ping();
  reply.send({ message: "pong" });
};

export const CoinGeckoCoinList = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const top100CoinList = await coinGeckoService.getCoinList();
  reply.send(top100CoinList);
};

export const updateCoinGeckoDbTable = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const top100CoinList = await coinGeckoService.updateCoinGeckoDbList();

  reply.send(top100CoinList);
};

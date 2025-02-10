import { FastifyReply, FastifyRequest } from "fastify";
import { CoinGeckoService } from "./coingecko.service";

const coinGeckoService = new CoinGeckoService();

export const CoinGeckoPing = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  reply.send({ message: "pong" });
};

export const CoinGeckoCoinList = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const top100CoinList = await coinGeckoService.getCoinList();
  reply.send(top100CoinList);
};

export const CoinCategoryList = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const categories = await coinGeckoService.getCoinCategories();
  reply.send(categories);
};

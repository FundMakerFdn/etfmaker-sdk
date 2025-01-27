import { FastifyReply, FastifyRequest } from "fastify";
import { BinanceService } from "./binance.service";

const binanceService = new BinanceService();

export const getBinanceFutureTokens = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const tokens = await binanceService.getFuturesTokens();
  reply.send(tokens);
};

export const getAllHistoricalCandles = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  // const { symbol, startTime, endTime } = request.query;
  const candles = await binanceService.getAllHistoricalCandles();
  reply.send({ candles });
};

export const getFundingRates = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  // const { symbol, startTime, endTime } = request.query;
  const fundingRates = await binanceService.getAllFundingRates();
  reply.send({ fundingRates });
};

export const getAllOpenInterest = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const openInterest = await binanceService.getAllOpenInterest();
  reply.send({ openInterest });
};

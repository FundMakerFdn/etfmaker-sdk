import { FastifyReply, FastifyRequest } from "fastify";
import { CoinDataService } from "./coindata.service";

const coinDataService = new CoinDataService();

export const calculateCoinData = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const data = await coinDataService.calculateCoinData();
  res.send({ data });
};

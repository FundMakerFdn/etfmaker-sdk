import { FastifyReply, FastifyRequest } from "fastify";
import { DataActualizationService } from "./data-actualization.service";
import { DataProcessingService } from "./data-processing.service";

const dataActualizationService = new DataActualizationService();
const dataProcessingService = new DataProcessingService();

export const calculateCoinData = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const data = await dataActualizationService.actualizeData();
  res.send({ data });
};

export const generateRebalanceData = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  await dataProcessingService.generateRebalanceData({
    etfId: "top20IndexHourly",
    startDate: new Date(1737801726000),
    initialPrice: 100,
  });
  res.send({ message: "Rebalance data generated" });
};

export const generateETFPriceData = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  await dataProcessingService.generateETFPrice("top20IndexHourly");
  res.send({ message: "ETF price data generated" });
};

export const generateEtfFundingRewardData = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  await dataProcessingService.setYieldETFFundingReward("top20IndexHourly");
  res.send({ message: "ETF funding reward data generated" });
};

export const getETFPrices = async (req: FastifyRequest, res: FastifyReply) => {
  const data = await dataProcessingService.getETFPrices();
  res.send({ data });
};

export const getAPYFundingRate = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const data = await dataProcessingService.APY();
  res.send({ data });
};

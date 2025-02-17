import { FastifyRequest, FastifyReply } from "fastify";
import { indexConfig } from "../index.config";
import { RebalanceService } from "./rebalance.service";
import moment from "moment";
import { RebalanceConfig } from "../interfaces/RebalanceConfig.interface";
import { CoinGeckoService } from "../coingecko/coingecko.service";
import { DataProcessingService } from "../coindata/data-processing.service";

const dataProcessingService = new DataProcessingService();
const coingeckoService = new CoinGeckoService();
const rebalanceService = new RebalanceService();

export const getRebalanceAssets = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const data = await rebalanceService.getRebalanceAssets();
  res.send({ data });
};

export const generateRebalanceData = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  await rebalanceService.generateRebalanceData(indexConfig);
  res.send({ message: "Rebalance data generated" });
};

export const getRebalanceDataCsv = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const data = await rebalanceService.getRebalanceDataCsv();
  res.header("Content-Type", "text/csv");
  res.header(
    "Content-Disposition",
    'attachment; filename="rebalance-data.csv"'
  );
  res.send(data);
};

export const getSimulatedRebalanceDataCsv = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const data = await rebalanceService.simulateRebalanceDataCSV(indexConfig);
  res.header("Content-Type", "text/csv");
  res.header(
    "Content-Disposition",
    'attachment; filename="rebalance-data.csv"'
  );
  res.send(data);
};

export const precalculateRebalanceData = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const categories = await coingeckoService.getCoinCategories();

  for (const category of categories) {
    const config = {
      initialPrice: 100,
      etfId: `top50IndexHourly${category["category_id"]}`,
      startDate: moment().subtract(6, "months").toDate(),
      category: category["category_id"],
    } as RebalanceConfig;

    await rebalanceService.generateRebalanceData(config);
    await dataProcessingService.generateETFPrice(config.etfId);
    await dataProcessingService.setYieldETFFundingReward(config.etfId);
  }

  res.send({ message: "Rebalance data precalculated" });
};

export const getRebalanceCategoriesList = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const data = await rebalanceService.getRebalanceCategories();
  res.send({ data });
};

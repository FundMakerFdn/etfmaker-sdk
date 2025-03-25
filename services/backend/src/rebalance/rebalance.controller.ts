import { FastifyRequest, FastifyReply } from "fastify";
import { indexDefaultConfig } from "../index.config";
import { RebalanceService } from "./rebalance.service";
import moment from "moment";
import { RebalanceConfig } from "../interfaces/RebalanceConfig.interface";
import { CoinGeckoService } from "../coingecko/coingecko.service";
import { ActualizationService } from "../actualization/actualization.service";
import { validateEtfIndexConfig } from "../helpers/EtfIndexConfigValidator";
import { etfIdTypeCheck } from "../helpers/typecheck/etfIdTypeCheck";
import { IndexGenerateManager } from "../index-price/managers/index-generate.manager";
import { ProcessingStatusService } from "../processing-status/processing-status.service";

const indexGenerateManager = new IndexGenerateManager();
const coingeckoService = new CoinGeckoService();
const rebalanceService = new RebalanceService();
const actualizationService = new ActualizationService();

export const getRebalanceAssets = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const queryParams = req.query as {
    etfId: RebalanceConfig["etfId"];
  };
  const etfId = queryParams?.etfId;

  try {
    if (!etfIdTypeCheck(etfId)) {
      res.send({ error: "Invalid etfId" });
      return;
    }
    const data = await rebalanceService.getRebalanceAssets(etfId);
    res.send({ data });
  } catch (error) {
    console.error(error);
    res.send({ error: "Can't get rebalance assets" });
  }
};

export const generateRebalanceData = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const indexConfigInput = req.body as RebalanceConfig;

  const indexConfig = indexConfigInput
    ? { ...indexConfigInput, startDate: new Date(indexConfigInput?.startDate) }
    : indexDefaultConfig;

  const validatorResult = validateEtfIndexConfig(indexConfig);

  if (!validatorResult.valid) {
    res.send({
      error: validatorResult.message,
      example: validatorResult.example,
    });
    return;
  }

  if (
    await ProcessingStatusService.isRebalanceIndexProcessing(indexConfig.etfId)
  ) {
    res.send({ error: "Rebalance data generation is already in progress" });
    return;
  }
  await ProcessingStatusService.setRebalanceIndexProcessing(indexConfig.etfId);

  try {
    await rebalanceService.generateRebalanceData(indexDefaultConfig);
    await ProcessingStatusService.setIndexRebalanceProcessingSuccess(
      indexConfig.etfId
    );
    res.send({ message: "Rebalance data generated" });
  } catch (error) {
    console.error(error);
    res.send({ error: "Can't generate ETF price data" });
  }
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
  const data = await rebalanceService.simulateRebalanceDataCSV(
    indexDefaultConfig
  );
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
  const categories = coingeckoService.getCoinCategories();

  for (const category of categories) {
    const config = {
      initialPrice: 100,
      etfId: `top50IndexHourly${category["category_id"]}`,
      startDate: moment().subtract(6, "months").toDate(),
      category: category["category_id"],
    } as RebalanceConfig;

    await actualizationService.actualizeData(config);
    await rebalanceService.generateRebalanceData(config);
    await indexGenerateManager.generateETFPrice(config.etfId);
    await indexGenerateManager.setYieldETFFundingReward(config.etfId);
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

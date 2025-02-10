import { FastifyReply, FastifyRequest } from "fastify";
import { DataActualizationService } from "./data-actualization.service";
import { DataProcessingService } from "./data-processing.service";
import { RebalanceConfig } from "../interfaces/RebalanceConfig.interface";

const dataActualizationService = new DataActualizationService();
const dataProcessingService = new DataProcessingService();

export const actualizeCoinData = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const data = await dataActualizationService.actualizeData({
    etfId: "top20IndexHourly",
    startDate: new Date(1737801726000),
    initialPrice: 100,
    // category: "ai-meme-coins",
  });
  res.send({ data });
};

export const getRebalanceAssets = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const data = await dataProcessingService.getRebalanceAssets();
  res.send({ data });
};

export const generateRebalanceData = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const config = {
    etfId: "top20IndexHourly",
    startDate: new Date(1737801726000),
    initialPrice: 100,
  } satisfies RebalanceConfig;

  await dataActualizationService.actualizeData(config);
  await dataProcessingService.generateRebalanceData(config);
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
  try {
    const data = await dataProcessingService.getETFPrices();
    res.send({ data });
  } catch (error) {
    res.send({ error: "Can't get ETF Prices data" });
  }
};

export const getCoinOHCL = async (req: FastifyRequest, res: FastifyReply) => {
  const queryParams = req.query as { coinId: string };
  const coinId = parseInt(queryParams.coinId);
  try {
    if (!coinId || isNaN(coinId)) {
      res.send({ error: "Invalid coinId" });
      return;
    }
    const data = await dataProcessingService.getCoinOhclData(coinId);
    res.send({ data });
  } catch (error) {
    res.send({ error: "Can't get OHCL data" });
  }
};

export const getAPYFundingRate = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const queryParams = req.query as { coinId: string };
  const coinId = parseInt(queryParams.coinId);
  try {
    if (coinId && typeof coinId === "number" && !isNaN(coinId)) {
      const data = await dataProcessingService.getCoinFundingAPY(coinId);
      res.send({ data });
    } else {
      const data = await dataProcessingService.fundingRewardAPY();
      res.send({ data });
    }
  } catch (error) {
    res.send({ error: "Can't get APY Funding Rate data" });
  }
};

export const getSUSDeApy = async (req: FastifyRequest, res: FastifyReply) => {
  const data = await dataProcessingService.sUSDeApy();
  res.send({ data });
};

export const getBackingSystem = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const queryParams = req.query as { coinId: string };
  const coinId = parseInt(queryParams.coinId);
  try {
    if (coinId && typeof coinId === "number" && !isNaN(coinId)) {
      const data = await dataProcessingService.getBackingSystemData(coinId);
      res.send({ data });
    } else {
      const data = await dataProcessingService.getBackingSystemData();
      res.send({ data });
    }
  } catch (error) {
    res.send({ error: "Can't get BackingSystem data" });
  }
};

export const getRebalanceDataCsv = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const data = await dataProcessingService.getRebalanceDataCsv();
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
  const data = await dataProcessingService.simulateRebalanceDataCSV({
    etfId: "top20IndexHourly",
    startDate: new Date(1737801726000),
    initialPrice: 100,
  });
  res.header("Content-Type", "text/csv");
  res.header(
    "Content-Disposition",
    'attachment; filename="rebalance-data.csv"'
  );
  res.send(data);
};

export const getAverageFundingChartData = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const queryParams = req.query as { coinId: string };
  const coinId = parseInt(queryParams.coinId);
  try {
    if (coinId && typeof coinId === "number" && !isNaN(coinId)) {
      const data = await dataProcessingService.getAssetFundingChartData(coinId);
      res.send({ data });
    } else {
      const data = await dataProcessingService.getAverageFundingChartData();
      res.send({ data });
    }
  } catch (error) {
    res.send({ error: "Can't get Average Funding Chart data" });
  }
};

export const getAverageYieldQuartalFundingData = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const queryParams = req.query as { coinId: string };
  const coinId = parseInt(queryParams.coinId);
  try {
    if (coinId && typeof coinId === "number" && !isNaN(coinId)) {
      const data =
        await dataProcessingService.getAverageYieldQuartalFundingAssetData(
          coinId
        );
      res.send({ data });
    } else {
      const data =
        await dataProcessingService.getAverageYieldQuartalFundingRewardData();
      res.send({ data });
    }
  } catch (error) {
    res.send({ error: "Can't get Average Yield Quartal Funding data" });
  }
};

export const getFundingDaysDistribution = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const queryParams = req.query as { coinId: string };
  const coinId = parseInt(queryParams.coinId);
  try {
    if (coinId && typeof coinId === "number" && !isNaN(coinId)) {
      const data =
        await dataProcessingService.getFundingDaysDistributionChartData(coinId);
      res.send({ data });
    } else {
      const data =
        await dataProcessingService.getFundingDaysDistributionChartData();
      res.send({ data });
    }
  } catch (error) {
    res.send({ error: "Can't get Funding Days Distribution data" });
  }
};

export const getSUSDeSpreadVs3mTreasury = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const queryParams = req.query as { coinId: string };
  const coinId = parseInt(queryParams.coinId);
  try {
    if (coinId && typeof coinId === "number" && !isNaN(coinId)) {
      const data = await dataProcessingService.getSUSDeSpreadVs3mTreasury(
        coinId
      );
      res.send({ data });
    } else {
      const data = await dataProcessingService.getSUSDeSpreadVs3mTreasury();
      res.send({ data });
    }
  } catch (error) {
    res.send({ error: "Can't get sUSDe Spread Vs 3m Treasury data" });
  }
};

import { FastifyReply, FastifyRequest } from "fastify";
import { DataProcessingService } from "./data-processing.service";
import { indexConfig } from "../index.config";
import { FilterInterface } from "../interfaces/FilterInterface";

const dataProcessingService = new DataProcessingService();

export const generateETFPriceData = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  await dataProcessingService.generateETFPrice(indexConfig.etfId);
  res.send({ message: "ETF price data generated" });
};

export const generateEtfFundingRewardData = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  await dataProcessingService.setYieldETFFundingReward(indexConfig.etfId);
  res.send({ message: "ETF funding reward data generated" });
};

export const getAllSpotUsdtPairs = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  try {
    const data = await dataProcessingService.getAllSpotUsdtPairs();
    res.send({ data });
  } catch (error) {
    res.send({ error: "Can't get all spot usdt pairs" + error });
  }
};

export const getETFPrices = async (req: FastifyRequest, res: FastifyReply) => {
  const queryParams = req.query as { from?: string; to?: string };
  const from = queryParams?.from;
  const to = queryParams?.to;
  try {
    const data = await dataProcessingService.getETFPrices(from, to);
    res.send({ data });
  } catch (error) {
    console.log(error);
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
      const data = await dataProcessingService.fundingRewardAPY(
        indexConfig.etfId
      );
      res.send({ data });
    }
  } catch (error) {
    res.send({ error: "Can't get APY Funding Rate data" });
  }
};

export const getSUSDeApy = async (req: FastifyRequest, res: FastifyReply) => {
  const data = await dataProcessingService.sUSDeApy(indexConfig.etfId);
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
    console.log(error);
    res.send({ error: "Can't get BackingSystem data" });
  }
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
      const data = await dataProcessingService.getAverageFundingChartData(
        indexConfig.etfId
      );
      res.send({ data });
    }
  } catch (error) {
    console.log(error);
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
        await dataProcessingService.getAverageYieldQuartalFundingRewardData(
          indexConfig.etfId
        );
      res.send({ data });
    }
  } catch (error) {
    console.log(error);
    res.send({ error: "Can't get Average Yield Quartal Funding data" });
  }
};

export const getFundingDaysDistribution = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const queryParams = req.query as {
    coinId: string;
    period: FilterInterface["period"];
  };
  const coinId = parseInt(queryParams.coinId);
  const period = queryParams.period;
  try {
    if (coinId && typeof coinId === "number" && !isNaN(coinId)) {
      const data =
        await dataProcessingService.getFundingDaysDistributionChartData(
          coinId,
          undefined,
          period
        );
      res.send({ data });
    } else {
      const data =
        await dataProcessingService.getFundingDaysDistributionChartData(
          undefined,
          undefined,
          period
        );
      res.send({ data });
    }
  } catch (error) {
    console.log(error);
    res.send({ error: "Can't get Funding Days Distribution data" });
  }
};

export const getSUSDeSpreadVs3mTreasury = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const queryParams = req.query as {
    coinId: string;
    period: FilterInterface["period"];
  };
  const coinId = parseInt(queryParams.coinId);
  const period = queryParams.period;
  try {
    if (coinId && typeof coinId === "number" && !isNaN(coinId)) {
      const data = await dataProcessingService.getSUSDeSpreadVs3mTreasury(
        indexConfig.etfId,
        coinId,
        period
      );
      res.send({ data });
    } else {
      const data = await dataProcessingService.getSUSDeSpreadVs3mTreasury(
        indexConfig.etfId,
        undefined,
        period
      );
      res.send({ data });
    }
  } catch (error) {
    console.log(error);
    res.send({ error: "Can't get sUSDe Spread Vs 3m Treasury data" });
  }
};

import { FastifyReply, FastifyRequest } from "fastify";
import { DataProcessingService } from "./data-processing.service";
import { indexDefaultConfig } from "../index.config";
import { FilterInterface } from "../interfaces/FilterInterface";
import { RebalanceConfig } from "../interfaces/RebalanceConfig.interface";
import { validateEtfIndexConfig } from "../helpers/EtfIndexConfigValidator";

const dataProcessingService = new DataProcessingService();

export const generateETFPriceData = async (
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

  try {
    await dataProcessingService.generateETFPrice(indexConfig.etfId);
    res.send({ message: "ETF price data generated" });
  } catch (error) {
    console.error(error);
    res.send({ error: "Can't generate ETF price data" });
  }
};

export const generateEtfFundingRewardData = async (
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

  try {
    await dataProcessingService.setYieldETFFundingReward(
      indexDefaultConfig.etfId
    );
    res.send({ message: "ETF funding reward data generated" });
  } catch (error) {
    console.error(error);
    res.send({ error: "Can't generate ETF price data" });
  }
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
  const queryParams = req.query as {
    groupBy?: string;
    from?: string;
    to?: string;
  };

  const groupBy = queryParams?.groupBy;
  const from = queryParams?.from;
  const to = queryParams?.to;

  try {
    const data = await dataProcessingService.getETFPrices(groupBy, from, to);
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
        indexDefaultConfig.etfId
      );
      res.send({ data });
    }
  } catch (error) {
    res.send({ error: "Can't get APY Funding Rate data" });
  }
};

export const getSUSDeApy = async (req: FastifyRequest, res: FastifyReply) => {
  const data = await dataProcessingService.sUSDeApy(indexDefaultConfig.etfId);
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
        indexDefaultConfig.etfId
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
          indexDefaultConfig.etfId
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
        indexDefaultConfig.etfId,
        coinId,
        period
      );
      res.send({ data });
    } else {
      const data = await dataProcessingService.getSUSDeSpreadVs3mTreasury(
        indexDefaultConfig.etfId,
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

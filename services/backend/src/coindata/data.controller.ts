import { FastifyReply, FastifyRequest } from "fastify";
import { DataProcessingService } from "./data-processing.service";
import { indexDefaultConfig } from "../index.config";
import { FilterInterface } from "../interfaces/FilterInterface";
import { IsValidDate } from "../helpers/CheckIsValidDate";

const dataProcessingService = new DataProcessingService();

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

export const getCoinOHCL = async (req: FastifyRequest, res: FastifyReply) => {
  const queryParams = req.query as {
    coinId: string;
    from?: string;
    to?: string;
  };

  const coinId = parseInt(queryParams.coinId);
  const from = queryParams.from;
  const to = queryParams.to;

  try {
    if (!coinId || isNaN(coinId) || !IsValidDate(from) || !IsValidDate(to)) {
      res.send({ error: "Invalid coinId" });
      return;
    }
    const data = await dataProcessingService.getCoinOhclData(coinId, from, to);
    res.send({ data });
  } catch (error) {
    console.error(error);
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

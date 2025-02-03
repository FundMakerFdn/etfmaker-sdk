import { FastifyReply, FastifyRequest } from "fastify";
import { DataActualizationService } from "./data-actualization.service";
import { DataProcessingService } from "./data-processing.service";
import {
  AmountPerContracts,
  AssetWeights,
  PricesDto,
} from "../interfaces/Rebalance.interface";

const dataActualizationService = new DataActualizationService();
const dataProcessingService = new DataProcessingService();

export const calculateCoinData = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const data = await dataActualizationService.actualizeData();
  res.send({ data });
};

export const getRecentCoinData = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const ids = (req.query as { ids?: string }).ids;

  if (!ids) {
    return res.status(400).send({ error: "No IDs provided" });
  }

  const data = await dataProcessingService.getRecentCoinsData(
    ids.split(",").map(Number)
  );

  res.send({ data });
};

export const getTopCoinsByMarketCap = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const amount = Number((req.query as { amount: string }).amount);

  if (!amount) {
    return res.status(400).send({ error: "No amount provided" });
  }

  const data = await dataProcessingService.getTopCoinsByMarketCap(amount);

  res.send({ data });
};

export const getCoinsPrices = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const filterData = req.body as {
    ids: number[];
    startTime: number;
    endTime: number;
  };

  if (!filterData?.ids || !filterData.endTime || !filterData.startTime) {
    return res.status(400).send({ error: "Wrong filter data provided" });
  }

  const data = await dataProcessingService.getCoinsPrices(
    filterData.ids,
    filterData.startTime,
    filterData.endTime
  );

  res.send({ data });
};

export const setAssetWeights = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const filterData = req.body as {
    assetsList: PricesDto[];
  };

  if (!filterData?.assetsList) {
    return res.status(400).send({ error: "Wrong filter data provided" });
  }

  const data = await dataProcessingService.setAssetWeights(
    filterData.assetsList
  );

  const assetWeights = await dataProcessingService.setAssetWeights(data);

  res.send({ data: assetWeights });
};

export const setAmountPerContracts = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const filterData = req.body as {
    assetsListWithWeights: AssetWeights[];
    etfPrice: number;
  };

  if (!filterData?.assetsListWithWeights || !filterData.etfPrice) {
    return res.status(400).send({ error: "Wrong filter data provided" });
  }

  const data = await dataProcessingService.setAmountPerContracts(
    filterData.assetsListWithWeights,
    filterData.etfPrice
  );

  res.send({ data });
};

export const getCloseETFPrice = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const filterData = req.body as {
    assetsAmountPerContracts: AmountPerContracts[];
    startTime: number;
    endTime: number;
  };

  if (
    !filterData?.assetsAmountPerContracts ||
    !filterData.startTime ||
    !filterData.endTime
  ) {
    return res.status(400).send({ error: "Wrong filter data provided" });
  }

  const data = await dataProcessingService.getCloseETFPrice(
    filterData.assetsAmountPerContracts,
    filterData.startTime,
    filterData.endTime
  );

  res.send({ data });
};

export const generateRebalanceData = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  await dataProcessingService.generateRebalanceData({
    etfId: "top10IndexWeekly",
    rebalancePeriod: "1w",
    startDate: new Date(1730365140000),
    initialPrice: 100,
  });
  res.send({ message: "Rebalance data generated" });
};

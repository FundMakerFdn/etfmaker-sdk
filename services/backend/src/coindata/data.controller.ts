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

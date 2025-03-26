import WebSocket from "ws";
import { indexPriceService } from "./index-price.service";
import { FastifyReply, FastifyRequest } from "fastify";
import { RebalanceConfig } from "../interfaces/RebalanceConfig.interface";
import { etfIdTypeCheck } from "../helpers/typecheck/etfIdTypeCheck";
import { OhclGroupByEnum } from "../enums/OhclGroupBy.enum";
import { ProcessingKeysEnum } from "../enums/Processing.enum";
import { validateEtfIndexConfig } from "../helpers/EtfIndexConfigValidator";
import { indexDefaultConfig } from "../index.config";
import { ProcessingStatusService } from "../processing-status/processing-status.service";

export const streamIndexPriceUpdates = async (
  socket: WebSocket,
  request: FastifyRequest
) => {
  const data = request.query as {
    startTimestamp: string;
    etfId: RebalanceConfig["etfId"];
    groupBy: OhclGroupByEnum;
  };

  const startTimestamp = Number(data?.startTimestamp);
  const etfId = data?.etfId;
  const groupBy = data?.groupBy;

  if (
    !startTimestamp ||
    isNaN(startTimestamp) ||
    !etfIdTypeCheck(etfId) ||
    !(groupBy in OhclGroupByEnum)
  ) {
    console.error("Invalid query params");
    socket.close();
    return;
  }

  try {
    await indexPriceService.setIndexPriceSocketClient({
      socket,
      startTimestamp,
      etfId,
      groupBy,
    });
  } catch (error) {
    console.error(error);
    socket.close();
  }
};

export const getETFPrices = async (req: FastifyRequest, res: FastifyReply) => {
  const queryParams = req.query as {
    groupBy: string;
    from: string;
    to: string;
    etfId: string;
  };

  const groupBy = queryParams?.groupBy as OhclGroupByEnum;
  const from = queryParams?.from;
  const to = queryParams?.to;
  const etfId = queryParams?.etfId;

  try {
    if (groupBy && !(groupBy in OhclGroupByEnum)) {
      res.send({ error: "Invalid groupBy" });
      return;
    }

    if (!etfIdTypeCheck(etfId)) {
      res.send({ error: "Invalid etfId" });
      return;
    }

    const data = await indexPriceService.getETFPrices({
      etfId,
      groupBy,
      from,
      to,
    });
    res.send({ data });
  } catch (error) {
    console.log(error);
    res.send({ error: "Can't get ETF Prices data" });
  }
};

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
    if (
      await ProcessingStatusService.isProcessing(ProcessingKeysEnum.etfPrice)
    ) {
      throw new Error("Already processing ETF price data");
    }

    await ProcessingStatusService.setProcessing(ProcessingKeysEnum.etfPrice);
    await indexPriceService.generateETFPrice(indexConfig.etfId);
    await ProcessingStatusService.setSuccess(ProcessingKeysEnum.etfPrice);

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
    await indexPriceService.setYieldETFFundingReward(indexDefaultConfig.etfId);
    res.send({ message: "ETF funding reward data generated" });
  } catch (error) {
    console.error(error);
    res.send({ error: "Can't generate ETF price data" });
  }
};

export const getAvailableteIndexEtfIds = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const availableIndexEtfIds =
    await indexPriceService.getAvailableIndexEtfIds();
  res.send({ data: availableIndexEtfIds });
};

export const getIndexTableList = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const indexTableList = await indexPriceService.getIndexTableListData();
  res.send({ data: indexTableList });
};

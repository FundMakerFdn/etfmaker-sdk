import { FastifyRequest, FastifyReply } from "fastify";
import { ActualizationService } from "./actualization.service";
import { indexDefaultConfig } from "../index.config";

const dataActualizationService = new ActualizationService();

export const actualizeCoinData = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const data = await dataActualizationService.actualizeData(indexDefaultConfig);
  res.send({ data });
};

import { AsyncTask, CronJob } from "toad-scheduler";
import { ActualizationService } from "./actualization.service";
import { indexDefaultConfig } from "../index.config";

const actializationService = new ActualizationService();

const CoinDataActualization = new AsyncTask(
  "Actualizing coin data",
  async () => {
    await actializationService.actualizeData(indexDefaultConfig);
  }
);

export const CoinDataActualizationCronJob = new CronJob(
  {
    cronExpression: "0 0 * * *", // Runs every day at midnight
  },
  CoinDataActualization,
  {
    preventOverrun: true,
  }
);

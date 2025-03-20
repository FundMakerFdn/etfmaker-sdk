import { parentPort } from "worker_threads";
import { IndexGenerateManager } from "../../managers/index-generate.manager";
import {
  AmountPerContracts,
  PricesDto,
} from "../../../interfaces/Rebalance.interface";

let etfManager: IndexGenerateManager | null = null;

if (!parentPort) {
  throw new Error("parentPort is not defined");
}

parentPort.on(
  "message",
  async (job: {
    etfId?: any;
    coinsWithPrices?: PricesDto[];
    startTime?: any;
    endTime?: any;
    price?: any;
  }) => {
    if (!parentPort) {
      throw new Error("parentPort is not defined");
    }

    try {
      // Create the ETFDataManager instance on first task (or update if needed)
      if (!etfManager) {
        etfManager = new IndexGenerateManager(job.etfId);
      }

      if (!etfManager) {
        throw new Error("etfManager is not initialized");
      }

      const { coinsWithPrices, startTime, endTime, price } = job;

      let amountPerContracts: AmountPerContracts[];
      if (coinsWithPrices && coinsWithPrices.length > 0) {
        const assetsWithWeights = await etfManager.setAssetWeights(
          coinsWithPrices,
          startTime,
          endTime
        );
        amountPerContracts = etfManager.setAmountPerContracts(
          assetsWithWeights,
          price
        );
      } else {
        amountPerContracts = [];
      }

      // Send back the result
      parentPort.postMessage({ result: amountPerContracts });
    } catch (error: any) {
      parentPort.postMessage({ error: error.message });
    }
  }
);

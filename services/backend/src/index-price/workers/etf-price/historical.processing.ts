import { parentPort } from "worker_threads";
import { IndexGenerateManager } from "../../managers/index-generate.manager";

let etfManager: IndexGenerateManager | null = null;

if (!parentPort) {
  throw new Error("parentPort is not defined");
}

parentPort.on(
  "message",
  async (job: {
    etfId?: any;
    coinIds?: any;
    startTime?: any;
    endTime?: any;
    price?: any;
    timestamp?: any;
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

      const { coinIds, startTime, endTime, price, timestamp } = job;

      // Process the minute task:
      const coinsWithPrices = await etfManager.getCoinsPriceStartEndRecords(
        coinIds,
        startTime,
        endTime
      );
      let result;
      if (coinsWithPrices.length > 0) {
        const assetsWithWeights = await etfManager.setAssetWeights(
          coinsWithPrices,
          startTime,
          endTime
        );
        const amountPerContracts = etfManager.setAmountPerContracts(
          assetsWithWeights,
          price
        );
        result = { amountPerContracts, timestamp };
      } else {
        result = { amountPerContracts: [], timestamp };
      }

      // Send back the result
      parentPort.postMessage({ result });
    } catch (error: any) {
      parentPort.postMessage({ error: error.message });
    }
  }
);

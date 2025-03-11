const { parentPort } = require("worker_threads");
const { ETFDataManager } = require("../../managers/etf-data.manager");

let etfManager = null;

parentPort.on("message", async (job) => {
  try {
    // Create the ETFDataManager instance on first task (or update if needed)
    if (!etfManager) {
      etfManager = new ETFDataManager(job.etfId);
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
        coinsWithPrices
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
  } catch (error) {
    parentPort.postMessage({ error: error.message });
  }
});

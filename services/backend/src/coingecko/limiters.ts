import Bottleneck from "bottleneck";

export const GetMarketCapLimiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: (1000 * 60) / 1000, // 1000 requests per minute
});

export const GetCoinDataLimiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: (1000 * 60) / 1000, // 1000 requests per minute
});

// Listener for when a job starts executing
GetMarketCapLimiter.on("executing", (info) => {
  // console.log(`Job executing with ID: ${info.options.id}`);
});

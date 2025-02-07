import Bottleneck from "bottleneck";

export const UsdMFuturesSymbolsLimiter = new Bottleneck({
  maxConcurrent: 10,
  minTime: 1000 / 90,
});

export const CoinMFuturesSymbolsLimiter = new Bottleneck({
  maxConcurrent: 10,
  minTime: 1000 / 90,
});

export const SpotsSymbolsLimiter = new Bottleneck({
  maxConcurrent: 10,
  minTime: 1000 / 90,
});

export const HistoricalCandlesLimiter = new Bottleneck({
  maxConcurrent: 10,
  minTime: 1000 / 90,
});

export const HistoricalCandlesLimiterBinanceVision = new Bottleneck({
  minTime: 10, // 6000 requests per minute
});

export const FundingRateLimiter = new Bottleneck({
  maxConcurrent: 10,
  minTime: 1000 / 90,
});

export const OpenInterestLimiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: (1000 * 60 * 5) / 1000, // 1000 requests per 5 minutes
});

// Listener for when a job starts executing
UsdMFuturesSymbolsLimiter.on("executing", (info) => {
  // console.log(`Job executing with ID: ${info.options.id}`);
});

CoinMFuturesSymbolsLimiter.on("executing", (info) => {
  // console.log(`Job executing with ID: ${info.options.id}`);
});

SpotsSymbolsLimiter.on("executing", (info) => {
  // console.log(`Job executing with ID: ${info.options.id}`);
});

HistoricalCandlesLimiter.on("executing", (info) => {
  // console.log(`Job executing with ID: ${info.options.id}`);
});

FundingRateLimiter.on("executing", (info) => {
  // console.log(`Job executing with ID: ${info.options.id}`);
});

OpenInterestLimiter.on("executing", (info) => {
  // console.log(`Job executing with ID: ${info.options.id}`);
});

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

export const FundingRateLimiter = new Bottleneck({
  maxConcurrent: 10,
  minTime: 1000 / 90,
});

export const OpenInterestLimiter = new Bottleneck({
  maxConcurrent: 10,
  minTime: (1000 * 60 * 5) / 1000, // 1000 requests per 5 minutes
});

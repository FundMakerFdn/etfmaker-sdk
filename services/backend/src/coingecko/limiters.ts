import Bottleneck from "bottleneck";

export const GetMarketCapLimiter = new Bottleneck({
  maxConcurrent: 10,
  minTime: (1000 * 60) / 500, // 500 requests per minute
});

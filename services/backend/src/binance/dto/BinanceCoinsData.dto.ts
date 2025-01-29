export interface BinanceCoinsDataDto {
  usdMFutures: Map<string, { symbol: string; pair: string }>;
  coinMFutures: Map<string, { symbol: string; pair: string }>;
  spots: Map<string, { symbol: string }>;
}

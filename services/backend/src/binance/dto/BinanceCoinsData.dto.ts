import { FuturesType } from "../../enums/FuturesType.enum";

export interface BinanceCoinsDataDto {
  usdMFutures: Map<
    string,
    { symbol: string; pair: string; futuresType: FuturesType }
  >;
  coinMFutures: Map<
    string,
    { symbol: string; pair: string; futuresType: FuturesType }
  >;
  spots: Map<string, { symbol: string }>;
}

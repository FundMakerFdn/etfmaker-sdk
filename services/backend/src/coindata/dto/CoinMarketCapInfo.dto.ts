import { CoinInterface } from "../../interfaces/Coin.interface";
import { MarketCapInterface } from "../../interfaces/MarketCap.interface";

export interface CoinMarketCapInfoDto {
  coin: CoinInterface;
  marketCap: MarketCapInterface;
  weight: number;
}

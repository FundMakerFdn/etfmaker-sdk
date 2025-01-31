import { CoinInterface } from "../../interfaces/Coin.interface";
import { FundingInterface } from "../../interfaces/Funding.interface";
import { MarketCapInterface } from "../../interfaces/MarketCap.interface";
import { OpenInterestInterface } from "../../interfaces/OpenInterest.interface";

export interface CoinInfoDto extends CoinInterface {
  price: string;
  funding: FundingInterface[] | null;
  marketCap: MarketCapInterface[] | null;
  openInterest: OpenInterestInterface[] | null;
}

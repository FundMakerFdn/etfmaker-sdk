import { CoinSourceEnum } from "../enums/CoinData.enum";

export interface CoinInterface {
  id: number;
  name: string;
  symbol: string;
  assetId: string;
  source: CoinSourceEnum;
}

import { CoinSourceEnum } from "../enums/CoinSource.enum";
import { CoinStatusEnum } from "../enums/CoinStatus.enum";

export interface CoinInterface {
  id: number;
  name: string;
  symbol: string;
  assetId: string;
  source: CoinSourceEnum;
  status: CoinStatusEnum;
  pair?: string;
}

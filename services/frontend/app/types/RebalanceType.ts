import { CandleType } from "./CandleType";

export interface RebalanceDto {
  id: number;
  etfId: string;
  timestamp: Date;
  price: string;
  data: AmountPerContracts[];
}

export interface PricesDto {
  coinId: number;
  startTime: CandleType;
  endTime: CandleType;
}

export interface AssetWeights extends PricesDto {
  weight: number;
}

export interface AmountPerContracts extends AssetWeights {
  amountPerContracts: number;
}

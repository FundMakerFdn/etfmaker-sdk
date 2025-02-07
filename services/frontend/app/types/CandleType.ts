export interface CandleType {
  id?: number;
  coinId: number;
  timestamp: Date;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

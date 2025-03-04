export interface OrderBookInterface {
  id?: number;
  coinId: number;
  time: string;
  spread: string;
  bidDepth: string;
  askDepth: string;
  spreadDepthPercentage: number;
}

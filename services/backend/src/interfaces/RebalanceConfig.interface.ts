export interface RebalanceConfig {
  etfId: `top${number}IndexWeekly`;
  rebalancePeriod: rebalancePeriod;
  startDate: Date;
  initialPrice: number;
}

export type rebalancePeriod = "1h" | "1d" | "1w" | "1m" | "1y";

export interface RebalanceConfig {
  etfId: `top${number}Index${
    | "Yearly"
    | "Monthly"
    | "Weekly"
    | "Daily"
    | "Hourly"}${string}`;
  startDate: Date;
  initialPrice: number;
  category?: string;
}

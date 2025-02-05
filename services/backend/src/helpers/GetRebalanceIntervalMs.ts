import { RebalanceConfig } from "../interfaces/RebalanceConfig.interface";

export const getRebalanceIntervalMs = (
  etfId: RebalanceConfig["etfId"]
): number => {
  const rebalancePeriod = RegExp(/(Yearly|Monthly|Weekly|Daily|Hourly)/).exec(
    etfId
  )?.[0];
  if (!rebalancePeriod) throw new Error("Invalid etfId");

  const periodMs = {
    Hourly: 60 * 60 * 1000,
    Daily: 24 * 60 * 60 * 1000,
    Weekly: 7 * 24 * 60 * 60 * 1000,
    Monthly: 30 * 24 * 60 * 60 * 1000,
    Yearly: 365 * 24 * 60 * 60 * 1000,
  }[rebalancePeriod];

  if (!periodMs) throw new Error("Invalid etfId");

  return periodMs;
};

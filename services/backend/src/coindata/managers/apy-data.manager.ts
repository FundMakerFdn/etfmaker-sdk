import Decimal from "decimal.js";
import { asc } from "drizzle-orm";
import { DataSource } from "../../db/DataSource";
import { EtfFundingReward, EtfPrice } from "../../db/schema";
import { RebalanceConfig } from "../../interfaces/RebalanceConfig.interface";
import { getRebalanceIntervalMs } from "../../helpers/GetRebalanceIntervalMs";

export class ApyDataManager {
  public static async fundingRewardAPY(): Promise<
    { time: number; value: number }[]
  > {
    const fundingRewards = await DataSource.selectDistinct()
      .from(EtfFundingReward)
      .orderBy(asc(EtfFundingReward.timestamp));

    if (fundingRewards.length === 0) return [];

    const etfId = fundingRewards[0].etfId;
    const updatePeriodMs = getRebalanceIntervalMs(
      etfId as RebalanceConfig["etfId"]
    );

    const amountOfUpdates = new Decimal(1000 * 60 * 60 * 24 * 365).div(
      updatePeriodMs
    );

    const apyTimeSeries = [];

    for (const event of fundingRewards) {
      const reward = new Decimal(event.reward);
      const APY = reward.plus(1).pow(amountOfUpdates).sub(1);
      apyTimeSeries.push({
        time: event.timestamp.getTime(),
        value: APY.toNumber(),
      });
    }
    return apyTimeSeries;
  }

  public static async sUSDeApy(): Promise<{ time: number; value: number }[]> {
    const apy = [] as { time: number; value: number }[];

    const eventEveryHour = new Decimal(1).div(new Decimal(365 * 24));

    const etfPriceData = await DataSource.selectDistinct({
      open: EtfPrice.open,
      close: EtfPrice.close,
      timestamp: EtfPrice.timestamp,
    })
      .from(EtfPrice)
      .orderBy(asc(EtfPrice.timestamp));

    if (etfPriceData.length === 0) return [];

    for (const etfPrice of etfPriceData) {
      const closeDecimal = new Decimal(etfPrice.close);
      const openDecimal = new Decimal(etfPrice.open);
      const division = closeDecimal.div(openDecimal);

      const power = division.abs().pow(eventEveryHour);
      const sub = power.sub(1);

      // Restore sign: If close < open, make APY negative
      const value = closeDecimal.gte(openDecimal)
        ? sub.toNumber()
        : sub.neg().toNumber();

      apy.push({
        time: etfPrice.timestamp.getTime(),
        value: Number(value),
      });
    }

    return apy;
  }
}

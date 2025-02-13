import Decimal from "decimal.js";
import { asc, eq } from "drizzle-orm";
import { DataSource } from "../../db/DataSource";
import {
  EtfFundingReward,
  EtfPrice,
  Funding,
  FundingRewardApy,
  sUSDeApy,
} from "../../db/schema";
import moment from "moment";
import { RebalanceConfig } from "../../interfaces/RebalanceConfig.interface";

export class ApyDataManager {
  public static async fundingRewardAPY(
    etfId: RebalanceConfig["etfId"]
  ): Promise<
    { time: number; value: number; etfId: RebalanceConfig["etfId"] }[]
  > {
    const fundingRewardApy = await DataSource.select({
      etfId: FundingRewardApy.etfId,
      time: FundingRewardApy.time,
      value: FundingRewardApy.value,
    })
      .from(FundingRewardApy)
      .orderBy(asc(FundingRewardApy.time));

    if (fundingRewardApy.length === 0) {
      return fundingRewardApy as {
        time: number;
        value: number;
        etfId: RebalanceConfig["etfId"];
      }[];
    }

    const fundingRewards = await DataSource.selectDistinctOn([
      EtfFundingReward.timestamp,
    ])
      .from(EtfFundingReward)
      .orderBy(asc(EtfFundingReward.timestamp));

    if (fundingRewards.length === 0) return [];

    const updatePeriodMs = moment(fundingRewards[1].timestamp)
      .diff(moment(fundingRewards[0].timestamp))
      .valueOf();

    const amountOfUpdates = new Decimal(1000 * 60 * 60 * 24 * 365).div(
      updatePeriodMs
    );

    const apyTimeSeries = [];

    for (const event of fundingRewards) {
      const reward = new Decimal(event.reward);
      const APY = reward.div(100).plus(1).pow(amountOfUpdates).sub(1);
      apyTimeSeries.push({
        etfId,
        time: event.timestamp.getTime() / 1000,
        value: APY.toNumber(),
      });
    }

    await DataSource.insert(FundingRewardApy).values(apyTimeSeries);
    return apyTimeSeries;
  }

  public static async coinFundingAPY(
    coinId: number
  ): Promise<{ time: number; value: number }[]> {
    const fundingData = await DataSource.selectDistinctOn([Funding.timestamp])
      .from(Funding)
      .where(eq(Funding.coinId, coinId))
      .orderBy(asc(Funding.timestamp));

    if (fundingData.length === 0) return [];

    const updatePeriodMs = moment(fundingData[1].timestamp)
      .diff(moment(fundingData[0].timestamp))
      .valueOf();

    const amountOfUpdates = new Decimal(1000 * 60 * 60 * 24 * 365).div(
      updatePeriodMs
    );

    const apyTimeSeries = [];

    for (const event of fundingData) {
      const rate = new Decimal(event.fundingRate);
      const APY = rate.div(100).plus(1).pow(amountOfUpdates).sub(1);
      apyTimeSeries.push({
        time: event.timestamp.getTime() / 1000,
        value: APY.toNumber(),
      });
    }
    return apyTimeSeries;
  }

  public static async sUSDeApy(
    etfId: RebalanceConfig["etfId"]
  ): Promise<
    { time: number; value: number; etfId: RebalanceConfig["etfId"] }[]
  > {
    const sUSDeApyData = await DataSource.select({
      etfId: sUSDeApy.etfId,
      time: sUSDeApy.time,
      value: sUSDeApy.value,
    })
      .from(sUSDeApy)
      .where(eq(sUSDeApy.etfId, etfId))
      .orderBy(asc(sUSDeApy.time));

    if (sUSDeApyData.length > 0) {
      return sUSDeApyData as {
        time: number;
        value: number;
        etfId: RebalanceConfig["etfId"];
      }[];
    }

    const apy = [] as {
      time: number;
      value: number;
      etfId: RebalanceConfig["etfId"];
    }[];

    const eventEveryMinute = new Decimal(1).div(new Decimal(365 * 24 * 60));

    const etfPriceData = await DataSource.selectDistinctOn(
      [EtfPrice.timestamp],
      {
        open: EtfPrice.open,
        close: EtfPrice.close,
        timestamp: EtfPrice.timestamp,
      }
    )
      .from(EtfPrice)
      .orderBy(asc(EtfPrice.timestamp));

    if (etfPriceData.length === 0) return [];

    for (const etfPrice of etfPriceData) {
      const closeDecimal = new Decimal(etfPrice.close);
      const openDecimal = new Decimal(etfPrice.open);
      const division = closeDecimal.div(openDecimal);

      const power = division.abs().pow(eventEveryMinute);
      const sub = power.sub(1);

      // Restore sign: If close < open, make APY negative
      const value = closeDecimal.gte(openDecimal)
        ? sub.toNumber()
        : sub.neg().toNumber();

      apy.push({
        etfId,
        time: etfPrice.timestamp.getTime() / 1000,
        value: Number(value),
      });
    }

    await DataSource.insert(sUSDeApy).values(apy);

    return apy;
  }
}

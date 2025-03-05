import Decimal from "decimal.js";
import { asc, eq, and, gt, sql } from "drizzle-orm";
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
import { FundingRewardApyReturnDto } from "../dto/FundingRewardApy.dto";
import { SUSDApyReturnDto } from "../dto/SUSDApy.dto";

export class ApyDataManager {
  public static async fundingRewardAPY(
    etfId: RebalanceConfig["etfId"]
  ): Promise<FundingRewardApyReturnDto[]> {
    const fundingRewardApyCached = await DataSource.select({
      etfId: FundingRewardApy.etfId,
      time: FundingRewardApy.time,
      value: FundingRewardApy.value,
    })
      .from(FundingRewardApy)
      .orderBy(asc(FundingRewardApy.time));

    const lastCachedTimestamp =
      fundingRewardApyCached.length > 0
        ? moment(fundingRewardApyCached[fundingRewardApyCached.length - 1].time)
        : moment(0);

    const fundingRewards = await DataSource.selectDistinctOn([
      EtfFundingReward.timestamp,
    ])
      .from(EtfFundingReward)
      .where(
        and(
          eq(EtfFundingReward.etfId, etfId),
          gt(EtfFundingReward.timestamp, lastCachedTimestamp.toDate())
        )
      )
      .orderBy(asc(EtfFundingReward.timestamp));

    if (fundingRewards.length < 2)
      return fundingRewardApyCached as FundingRewardApyReturnDto[];

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
        time: event.timestamp,
        value: APY.toNumber(),
      });
    }

    try {
      await DataSource.insert(FundingRewardApy).values(apyTimeSeries);
    } catch (error) {
      console.log("Error inserting funding reward APY data", error);
    }

    const requstedData = (await DataSource.selectDistinctOn(
      [FundingRewardApy.time],
      {
        etfId: FundingRewardApy.etfId,
        time: FundingRewardApy.time,
        value: FundingRewardApy.value,
      }
    )
      .from(FundingRewardApy)
      .orderBy(asc(FundingRewardApy.time))) as FundingRewardApyReturnDto[];

    return requstedData;
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
  ): Promise<SUSDApyReturnDto[]> {
    const lastCachedTimestamp = await DataSource.select({
      latestTime: sql`MAX(${sUSDeApy.time})`.as("latestTime"),
    })
      .from(sUSDeApy)
      .where(eq(sUSDeApy.etfId, etfId))
      .then((res) => res[0]?.latestTime ?? new Date(0)); // Default to epoch if no cache

    const etfPriceData = await DataSource.select({
      open: EtfPrice.open,
      close: EtfPrice.close,
      timestamp: EtfPrice.timestamp,
    })
      .from(EtfPrice)
      .where(
        and(
          eq(EtfPrice.etfId, etfId),
          gt(EtfPrice.timestamp, new Date(lastCachedTimestamp as string))
        )
      )
      .orderBy(asc(EtfPrice.timestamp))
      .execute();

    if (etfPriceData.length === 0) return [];

    const apy: {
      time: Date;
      value: number;
      etfId: RebalanceConfig["etfId"];
    }[] = [];
    const eventEveryMinute = 1 / (365 * 24 * 60); // Precompute fraction

    for (const etfPrice of etfPriceData) {
      const { open, close, timestamp } = etfPrice;

      const openNum = Number(open);
      const closeNum = Number(close);

      if (openNum === 0) continue; // Prevent division by zero

      const ratio = closeNum / openNum;
      const power = Math.pow(Math.abs(ratio), eventEveryMinute) - 1;

      apy.push({
        etfId,
        time: timestamp,
        value: closeNum >= openNum ? power : -power,
      });
    }

    const chunkSize = 500; // Adjust for DB performance
    for (let i = 0; i < apy.length; i += chunkSize) {
      await DataSource.insert(sUSDeApy).values(apy.slice(i, i + chunkSize));
    }

    return DataSource.select({
      date: sql`TO_CHAR(DATE_TRUNC('day', ${sUSDeApy.time}), 'MM/DD/YYYY')`.as(
        "date"
      ),
      value: sql`AVG(${sUSDeApy.value})`.as("avg_value"),
    })
      .from(sUSDeApy)
      .where(eq(sUSDeApy.etfId, etfId))
      .groupBy(sql`DATE_TRUNC('day', ${sUSDeApy.time})`)
      .orderBy(asc(sql`DATE_TRUNC('day', ${sUSDeApy.time})`)) as Promise<
      SUSDApyReturnDto[]
    >;
  }
}

import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { Coins, EtfFundingReward, Funding, Rebalance } from "../../db/schema";
import { DataSource } from "../../db/DataSource";
import {
  AmountPerContracts,
  RebalanceDto,
} from "../../interfaces/Rebalance.interface";
import moment from "moment";
import Decimal from "decimal.js";
import { FuturesType } from "../../enums/FuturesType.enum";
import { RebalanceConfig } from "../../interfaces/RebalanceConfig.interface";

export class FundingDataManager {
  public static async getAverageFundingChartData(): Promise<{
    [assetName: string]: { time: number; value: number }[];
  }> {
    const oldestRebalanceData = await DataSource.select({
      timestamp: Rebalance.timestamp,
    })
      .from(Rebalance)
      .orderBy(asc(Rebalance.timestamp))
      .limit(1);

    const latestRebalanceData = await DataSource.select({
      data: Rebalance.data,
    })
      .from(Rebalance)
      .orderBy(desc(Rebalance.timestamp))
      .limit(1);

    if (oldestRebalanceData.length === 0 || latestRebalanceData.length === 0)
      return {};

    const data = {} as {
      [assetName: string]: { time: number; value: number }[];
    };

    for (const asset of latestRebalanceData[0].data as RebalanceDto["data"]) {
      const coinName = await DataSource.select({
        name: Coins.name,
      })
        .from(Coins)
        .where(eq(Coins.id, asset.coinId))
        .limit(1);

      data[coinName[0].name] = (
        await DataSource.selectDistinct({
          time: Funding.timestamp,
          value: Funding.fundingRate,
        })
          .from(Funding)
          .where(
            and(
              eq(Funding.coinId, asset.coinId),
              gte(Funding.timestamp, oldestRebalanceData[0].timestamp)
            )
          )
          .orderBy(asc(Funding.timestamp))
      ).map((funding) => ({
        time: funding.time.getTime(),
        value: +funding.value,
      }));
    }

    return data;
  }

  public static async getAverageYieldQuartalFundingRewardData(): Promise<
    { quarter: string; avgYield: number }[]
  > {
    return (
      await DataSource.selectDistinct({
        quarter: sql`DATE_TRUNC('quarter', ${EtfFundingReward.timestamp})`, // Group by quarter
        avgYield: sql`AVG(${EtfFundingReward.reward}::NUMERIC)`, // Compute avg yield
      })
        .from(EtfFundingReward)
        .groupBy(sql`DATE_TRUNC('quarter', ${EtfFundingReward.timestamp})`)
        .orderBy(sql`DATE_TRUNC('quarter', ${EtfFundingReward.timestamp})`)
    ).map((funding) => ({
      quarter: moment(funding.quarter as string).format("YYYY-MM-DD"),
      avgYield: Number(funding.avgYield),
    }));
  }

  public static async getFundingDaysDistributionChartData(
    etfId?: RebalanceConfig["etfId"],
    period: "day" | "week" | "month" | "year" = "year"
  ): Promise<{ positive: number; negative: number }> {
    let lastRebalance;
    if (etfId) {
      lastRebalance = await DataSource.select()
        .from(Rebalance)
        .where(eq(Rebalance.etfId, etfId))
        .orderBy(desc(Rebalance.timestamp))
        .limit(1);
    } else {
      lastRebalance = await DataSource.select()
        .from(Rebalance)
        .orderBy(desc(Rebalance.timestamp))
        .limit(1);
    }
    if (!lastRebalance.length) {
      throw new Error("No rebalance data found");
    }
    const rebalanceRecord = lastRebalance[0];
    const allAssets = rebalanceRecord.data as AmountPerContracts[];

    const perpetualCoins = await DataSource.select()
      .from(Coins)
      .where(
        and(
          inArray(
            Coins.id,
            allAssets.map((asset) => asset.coinId)
          ),
          eq(Coins.futuresType, FuturesType.PERPETUAL)
        )
      );
    const coinIds = perpetualCoins.map((coin) => coin.id);

    const weightMap = new Map<number, Decimal>();
    for (const asset of allAssets) {
      if (coinIds.includes(asset.coinId)) {
        weightMap.set(asset.coinId, new Decimal(asset.weight));
      }
    }

    let startDate: number = 0;
    if (period === "day") {
      startDate = moment().subtract(1, "days").valueOf();
    } else if (period === "week") {
      startDate = moment().subtract(1, "weeks").valueOf();
    } else if (period === "month") {
      startDate = moment().subtract(1, "months").valueOf();
    } else if (period === "year") {
      startDate = moment().subtract(1, "years").valueOf();
    }

    const aggregatedFunding = await DataSource.select({
      day: sql`DATE(${Funding.timestamp})`,
      coinId: Funding.coinId,
      avgRate: sql`AVG(CAST(${Funding.fundingRate} AS double precision))`,
    })
      .from(Funding)
      .where(
        and(
          inArray(Funding.coinId, coinIds),
          gte(Funding.timestamp, new Date(startDate))
        )
      )
      .groupBy(sql`DATE(${Funding.timestamp})`, Funding.coinId);

    const fundingByDay = new Map<
      string,
      Array<{ coinId: number; avgRate: string }>
    >();
    for (const record of aggregatedFunding) {
      const dayKey = record.day as string;
      if (!fundingByDay.has(dayKey)) {
        fundingByDay.set(dayKey, []);
      }
      fundingByDay.get(dayKey)!.push({
        coinId: record.coinId,
        avgRate: record.avgRate as string,
      });
    }

    let positiveDays = 0;
    let negativeDays = 0;

    for (const [_day, fundingEntries] of fundingByDay.entries()) {
      if (fundingEntries.length !== coinIds.length) continue;

      let weightedSum = new Decimal(0);
      let completeDay = true;

      for (const coinId of coinIds) {
        const entry = fundingEntries.find((e) => e.coinId === coinId);
        if (!entry) {
          completeDay = false;
          break;
        }
        const coinAvgRate = new Decimal(entry.avgRate);
        const coinWeight = weightMap.get(coinId);
        if (!coinWeight) {
          completeDay = false;
          break;
        }
        weightedSum = weightedSum.add(coinAvgRate.mul(coinWeight));
      }

      if (!completeDay) continue;
      if (weightedSum.gt(0)) {
        positiveDays++;
      } else {
        negativeDays++;
      }
    }

    const totalDays = positiveDays + negativeDays;
    if (totalDays === 0) {
      throw new Error("No complete funding data found for all coins.");
    }

    const calculateDistributionPercent = (value: number): number =>
      new Decimal(value).div(totalDays).mul(100).toDecimalPlaces(2).toNumber();

    return {
      positive: calculateDistributionPercent(positiveDays),
      negative: calculateDistributionPercent(negativeDays),
    };
  }
}

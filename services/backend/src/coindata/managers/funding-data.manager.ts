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
    const coins = await DataSource.select({
      name: Coins.name,
      id: Coins.id,
    })
      .from(Coins)
      .where(
        inArray(
          Coins.id,
          (latestRebalanceData[0].data as RebalanceDto["data"]).map(
            (asset) => asset.coinId
          )
        )
      );

    for (const coin of coins) {
      const fundingRates = await DataSource.select({
        time: sql`date_trunc('hour', ${Funding.timestamp})`,
        value: sql`AVG(${Funding.fundingRate}::numeric)`,
      })
        .from(Funding)
        .where(
          and(
            eq(Funding.coinId, coin.id),
            gte(Funding.timestamp, oldestRebalanceData[0].timestamp)
          )
        )
        .groupBy(sql`date_trunc('hour', ${Funding.timestamp})`)
        .orderBy(asc(sql`date_trunc('hour', ${Funding.timestamp})`));

      const windowSize = 8; // 8 hours moving average
      const movingAverage = fundingRates.map((rate, index, array) => {
        const start = Math.max(0, index - windowSize + 1);
        const window = array.slice(start, index + 1);
        const sum = window.reduce((acc, curr) => acc + Number(curr.value), 0);
        return {
          time: new Date(rate.time as string).getTime() / 1000,
          value: sum / window.length,
        };
      });

      data[coin.name] = movingAverage;
    }

    return data;
  }

  public static async getAverageYieldQuartalFundingRewardData(): Promise<
    { quarter: number; avgYield: number }[]
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
      quarter: new Date(funding.quarter as string).getTime() / 1000,
      avgYield: Number(funding.avgYield),
    }));
  }

  public static async getAverageYieldQuartalFundingAssetData(
    coinId: number
  ): Promise<{ quarter: number; avgYield: number }[]> {
    return (
      await DataSource.selectDistinct({
        quarter: sql`DATE_TRUNC('quarter', ${Funding.timestamp})`, // Group by quarter
        avgYield: sql`AVG(${Funding.fundingRate}::NUMERIC)`, // Compute avg yield
      })
        .from(Funding)
        .where(eq(Funding.coinId, coinId))
        .groupBy(sql`DATE_TRUNC('quarter', ${Funding.timestamp})`)
        .orderBy(sql`DATE_TRUNC('quarter', ${Funding.timestamp})`)
    ).map((funding) => ({
      quarter: new Date(funding.quarter as string).getTime() / 1000,
      avgYield: Number(funding.avgYield),
    }));
  }

  public static async getFundingDaysDistributionChartData(
    coinId?: number,
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

    let coinIds;
    if (coinId) {
      if (!perpetualCoins.find((coin) => coin.id === coinId)) {
        return { positive: 0, negative: 0 };
      }
      coinIds = [coinId];
    } else {
      coinIds = perpetualCoins.map((coin) => coin.id);
    }

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

  public static async getAssetFundingChartData(
    coinId: number
  ): Promise<{ [assetName: string]: { time: number; value: number }[] }> {
    const coinName =
      (
        await DataSource.select({ coinName: Coins.name })
          .from(Coins)
          .where(eq(Coins.id, coinId))
          .limit(1)
      )?.[0]?.coinName ?? "";

    const fundingRates = await DataSource.selectDistinctOn(
      [Funding.timestamp],
      {
        time: Funding.timestamp,
        value: Funding.fundingRate,
      }
    )
      .from(Funding)
      .where(eq(Funding.coinId, coinId))
      .orderBy(asc(Funding.timestamp));

    const windowSize = 8; // 8 hours moving average
    const movingAverage = fundingRates.map((rate, index, array) => {
      const start = Math.max(0, index - windowSize + 1);
      const window = array.slice(start, index + 1);
      const sum = window.reduce((acc, curr) => acc + Number(curr.value), 0);
      return {
        time: rate.time.getTime() / 1000,
        value: sum / window.length,
      };
    });

    return { [coinName]: movingAverage };
  }
}

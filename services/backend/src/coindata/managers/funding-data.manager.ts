import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { Coins, EtfFundingReward, Funding, Rebalance } from "../../db/schema";
import { DataSource } from "../../db/DataSource";
import { RebalanceDto } from "../../interfaces/Rebalance.interface";
import moment from "moment";

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
}

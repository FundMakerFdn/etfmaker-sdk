import Decimal from "decimal.js";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { DataSource } from "../../db/DataSource";
import {
  Coins,
  EtfPrice,
  Funding,
  MarketCap,
  Rebalance,
} from "../../db/schema";
import { AmountPerContracts } from "../../interfaces/Rebalance.interface";
import { RebalanceConfig } from "../../interfaces/RebalanceConfig.interface";
import { FuturesType } from "../../enums/FuturesType.enum";
import moment from "moment";

export class ChartDataManager {
  public static async getSUSDeSpreadVs3mTreasury(
    coinId?: number,
    etfId?: RebalanceConfig["etfId"],
    period: "day" | "week" | "month" | "year" = "year"
  ): Promise<
    {
      time: number;
      value: number;
    }[]
  > {
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

    const rebalanceData = lastRebalance[0].data as AmountPerContracts[];

    const perpetualCoins = await DataSource.select()
      .from(Coins)
      .where(
        and(
          inArray(
            Coins.id,
            rebalanceData.map((asset) => asset.coinId)
          ),
          eq(Coins.futuresType, FuturesType.PERPETUAL)
        )
      );

    let perpetualCoinIds;
    if (coinId) {
      if (!perpetualCoins.find((coin) => coin.id === coinId)) {
        return [];
      }
      perpetualCoinIds = [coinId];
    } else {
      perpetualCoinIds = perpetualCoins.map((coin) => coin.id);
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

    const treasuryRates = await DataSource.select({
      timestamp: sql`DATE_TRUNC('day', ${Funding.timestamp})`,
      avgRate: sql`AVG(CAST(${Funding.fundingRate} AS double precision))`,
    })
      .from(Funding)
      .where(
        and(
          inArray(Funding.coinId, perpetualCoinIds),
          gte(Funding.timestamp, new Date(startDate))
        )
      )
      .groupBy(sql`DATE_TRUNC('day', ${Funding.timestamp})`)
      .orderBy(sql`DATE_TRUNC('day', ${Funding.timestamp})`);

    const etfPrices = await DataSource.select({
      timestamp: sql`DATE(${EtfPrice.timestamp})`,
      price: sql`AVG(CAST(${EtfPrice.close} AS double precision))`,
    })
      .from(EtfPrice)
      .where(gte(EtfPrice.timestamp, new Date(startDate)))
      .groupBy(sql`DATE(${EtfPrice.timestamp})`)
      .orderBy(sql`DATE(${EtfPrice.timestamp})`);

    const spreads = [];

    for (const etfPrice of etfPrices as { timestamp: Date; price: string }[]) {
      const matchingRate = treasuryRates.find((rate: any) =>
        moment(rate.timestamp).isSame(moment(etfPrice.timestamp))
      );

      if (matchingRate) {
        const etfYield = new Decimal(etfPrice.price);
        const treasuryYield = new Decimal(matchingRate.avgRate as string);

        spreads.push({
          time: moment(etfPrice.timestamp).valueOf() / 1000,
          value: etfYield.sub(treasuryYield).toNumber(),
        });
      }
    }

    return spreads;
  }

  public static async getBackingSystemData(coinId?: number): Promise<{
    [assetName: string]: { time: number; value: number }[];
  }> {
    let coinIds = [];

    if (coinId) {
      coinIds = [coinId];
    } else {
      const rebalanceData = await DataSource.select()
        .from(Rebalance)
        .orderBy(desc(Rebalance.timestamp))
        .limit(1);

      if (rebalanceData.length === 0) return {};
      coinIds = (rebalanceData[0].data as AmountPerContracts[]).map(
        (asset) => asset.coinId
      );
    }
    const backingSystem = {} as {
      [assetName: string]: { time: number; value: number }[];
    };

    const coins = await DataSource.select()
      .from(Coins)
      .where(inArray(Coins.id, coinIds));

    for (const coin of coins) {
      backingSystem[coin.name] = (
        await DataSource.selectDistinctOn([MarketCap.timestamp])
          .from(MarketCap)
          .where(eq(MarketCap.coinId, coin.id))
          .orderBy(asc(MarketCap.timestamp))
      ).map((marketCap) => ({
        time: marketCap.timestamp.getTime() / 1000,
        value: Number(marketCap.marketCap),
      }));
    }

    return backingSystem;
  }
}

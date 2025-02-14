import Decimal from "decimal.js";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { DataSource } from "../../db/DataSource";
import {
  BackingSystem,
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
    etfId: RebalanceConfig["etfId"],
    period: "day" | "week" | "month" | "year" = "year",
    coinId?: number
  ): Promise<{ time: number; value: number }[]> {
    const now = moment().utc();

    const requestedStartDate = now
      .clone()
      .subtract(1, `${period}s`)
      .startOf("day")
      .toDate();
    const fullYearStartDate = now
      .clone()
      .subtract(1, "years")
      .startOf("day")
      .toDate();

    const lastCachedEntry = await DataSource.select({
      time: BackingSystem.time,
    })
      .from(BackingSystem)
      .where(eq(BackingSystem.etfId, etfId))
      .orderBy(desc(BackingSystem.time))
      .limit(1);

    const lastCachedTimestamp = lastCachedEntry.length
      ? moment.unix(lastCachedEntry[0].time)
      : moment(fullYearStartDate);

    const lastRebalance = await DataSource.select()
      .from(Rebalance)
      .where(eq(Rebalance.etfId, etfId))
      .orderBy(desc(Rebalance.timestamp))
      .limit(1);

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

    const perpetualCoinIds = coinId
      ? perpetualCoins.some((coin) => coin.id === coinId)
        ? [coinId]
        : []
      : perpetualCoins.map((coin) => coin.id);

    if (!perpetualCoinIds.length) {
      return [];
    }

    // Fetch treasury rates for missing period
    const treasuryRates = await DataSource.select({
      coinId: Funding.coinId,
      timestamp: sql`DATE_TRUNC('day', ${Funding.timestamp})`,
      avgRate: sql`AVG(CAST(${Funding.fundingRate} AS double precision))`,
    })
      .from(Funding)
      .where(
        and(
          inArray(Funding.coinId, perpetualCoinIds),
          gte(Funding.timestamp, lastCachedTimestamp.toDate()) // Only get new data
        )
      )
      .groupBy(sql`DATE_TRUNC('day', ${Funding.timestamp})`)
      .orderBy(sql`DATE_TRUNC('day', ${Funding.timestamp})`);

    const etfPrices = await DataSource.select({
      timestamp: sql`DATE(${EtfPrice.timestamp})`,
      price: sql`AVG(CAST(${EtfPrice.close} AS double precision))`,
    })
      .from(EtfPrice)
      .where(gte(EtfPrice.timestamp, lastCachedTimestamp.toDate()))
      .groupBy(sql`DATE(${EtfPrice.timestamp})`)
      .orderBy(sql`DATE(${EtfPrice.timestamp})`);

    const newValues = [];
    for (const etfPrice of etfPrices as { timestamp: Date; price: string }[]) {
      const matchingRate = treasuryRates.find((rate: any) =>
        moment(rate.timestamp).isSame(moment(etfPrice.timestamp))
      );

      if (matchingRate) {
        const etfYield = new Decimal(etfPrice.price);
        const treasuryYield = new Decimal(matchingRate.avgRate as string);

        const time = moment(etfPrice.timestamp).unix();
        const value = etfYield.sub(treasuryYield).toNumber();

        newValues.push({
          coinId: matchingRate.coinId,
          etfId,
          time,
          value,
        });
      }
    }

    // Insert new missing data
    if (newValues.length) {
      await DataSource.insert(BackingSystem).values(newValues);
    }

    // Fetch final data from cache including new entries
    const finalData = await DataSource.select({
      time: BackingSystem.time,
      value: BackingSystem.value,
    })
      .from(BackingSystem)
      .where(
        and(
          eq(BackingSystem.etfId, etfId),
          gte(
            BackingSystem.time,
            Math.floor(fullYearStartDate.getTime() / 1000)
          ),
          coinId ? eq(BackingSystem.coinId, coinId) : undefined
        )
      )
      .orderBy(asc(BackingSystem.time));

    // Filter data to return only requested period
    return finalData.filter((data) =>
      moment.unix(data.time).isBetween(requestedStartDate, now, null, "[]")
    );
  }

  public static async getBackingSystemData(coinId?: number): Promise<{
    [assetName: string]: { time: number; value: number }[];
  }> {
    let data: { [assetName: string]: { time: number; value: number }[] } = {};

    if (coinId) {
      const coin = await DataSource.select()
        .from(Coins)
        .where(eq(Coins.id, coinId));

      if (!coin.length) throw new Error("Coin not found");

      data[coin[0].name] = await DataSource.select({
        time: BackingSystem.time,
        value: BackingSystem.value,
      })
        .from(BackingSystem)
        .where(eq(BackingSystem.coinId, coinId))
        .orderBy(asc(BackingSystem.time));
    } else {
      const rawData = await DataSource.select({
        coinName: Coins.name,
        backingSystem: sql`
          json_agg(json_build_object('time', ${BackingSystem.time}, 'value', ${BackingSystem.value})) 
        `.as("backingSystem"),
      })
        .from(BackingSystem)
        .leftJoin(Coins, eq(BackingSystem.coinId, Coins.id))
        .groupBy(Coins.name)
        .orderBy(asc(BackingSystem.time));

      for (const { coinName, backingSystem } of rawData) {
        if (coinName)
          data[coinName] = backingSystem as { time: number; value: number }[];
      }
    }

    if (data) return data;

    const rebalanceData = await DataSource.select()
      .from(Rebalance)
      .orderBy(desc(Rebalance.timestamp))
      .limit(1);

    if (rebalanceData.length === 0) return {};

    const coinIds = (rebalanceData[0].data as AmountPerContracts[]).map(
      (asset) => asset.coinId
    );
    const backingSystem = {} as {
      [assetName: string]: { time: number; value: number }[];
    };

    const coins = await DataSource.select()
      .from(Coins)
      .where(inArray(Coins.id, coinIds));

    const values = {} as {
      time: number;
      value: number;
      coinId: number;
      etfId: string;
    }[];

    for (const coin of coins) {
      const data = (
        await DataSource.selectDistinctOn([MarketCap.timestamp])
          .from(MarketCap)
          .where(eq(MarketCap.coinId, coin.id))
          .orderBy(asc(MarketCap.timestamp))
      ).map((marketCap) => ({
        time: marketCap.timestamp.getTime() / 1000,
        value: Number(marketCap.marketCap),
      }));

      backingSystem[coin.name] = data;

      values.push(
        ...data.map((value) => ({
          time: value.time,
          value: value.value,
          coinId: coin.id,
          etfId: rebalanceData[0].etfId,
        }))
      );
    }

    await DataSource.insert(BackingSystem).values(values);

    return backingSystem;
  }
}

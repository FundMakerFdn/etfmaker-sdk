import Decimal from "decimal.js";
import { and, asc, desc, eq, gt, gte, inArray, sql } from "drizzle-orm";
import { DataSource } from "../../db/DataSource";
import { AmountPerContracts } from "../../interfaces/Rebalance.interface";
import { RebalanceConfig } from "../../interfaces/RebalanceConfig.interface";
import { FuturesType } from "../../enums/FuturesType.enum";
import moment from "moment";
import { CoinSourceEnum } from "../../enums/CoinSource.enum";
import { EtfPrice } from "../../db/schema/etfPrice";
import {
  sUSDeSpreadVs3mTreasury,
  Rebalance,
  Coins,
  Funding,
  MarketCap,
} from "../../db/schema";

export class ChartDataManager {
  public static async getSUSDeSpreadVs3mTreasury(
    etfId: RebalanceConfig["etfId"],
    coinId?: number,
    period?: "day" | "week" | "month" | "year"
  ): Promise<{ time: Date; value: number }[]> {
    const now = moment().utc();

    let requestedStartDate = new Date(0);

    if (period) {
      requestedStartDate = now
        .clone()
        .subtract(1, `${period}s`)
        .startOf("day")
        .toDate();
    }

    const fullYearStartDate = new Date(0);

    const lastCachedEntry = await DataSource.select({
      timestamp: sUSDeSpreadVs3mTreasury.time,
    })
      .from(sUSDeSpreadVs3mTreasury)
      .where(eq(sUSDeSpreadVs3mTreasury.etfId, etfId))
      .orderBy(desc(sUSDeSpreadVs3mTreasury.time))
      .limit(1);

    const lastCachedTimestamp = lastCachedEntry.length
      ? moment(lastCachedEntry[0].timestamp).add(1, "day").toDate()
      : moment(fullYearStartDate).toDate();

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
          gt(Funding.timestamp, lastCachedTimestamp) // Only get new data
        )
      )
      .groupBy(sql`DATE_TRUNC('day', ${Funding.timestamp}), ${Funding.coinId}`)
      .orderBy(sql`DATE_TRUNC('day', ${Funding.timestamp})`);

    const etfPrices = await DataSource.select({
      timestamp: sql`DATE(${EtfPrice.timestamp})`,
      price: sql`AVG(CAST(${EtfPrice.close} AS double precision))`,
    })
      .from(EtfPrice)
      .where(gt(EtfPrice.timestamp, lastCachedTimestamp))
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

        const time = new Date(etfPrice.timestamp);
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
      await DataSource.insert(sUSDeSpreadVs3mTreasury).values(newValues);
    }

    // Fetch final data from cache including new entries
    const finalData = await DataSource.selectDistinctOn(
      [sUSDeSpreadVs3mTreasury.time],
      {
        time: sUSDeSpreadVs3mTreasury.time,
        value: sUSDeSpreadVs3mTreasury.value,
      }
    )
      .from(sUSDeSpreadVs3mTreasury)
      .where(
        and(
          eq(sUSDeSpreadVs3mTreasury.etfId, etfId),
          gte(sUSDeSpreadVs3mTreasury.time, requestedStartDate),
          coinId ? eq(sUSDeSpreadVs3mTreasury.coinId, coinId) : undefined
        )
      )
      .orderBy(asc(sUSDeSpreadVs3mTreasury.time));

    return finalData;
  }

  public static async getBackingSystemData(coinId?: number): Promise<any[]> {
    let coinIds: number[] = [];

    if (coinId) {
      coinIds = [coinId];
    } else {
      const rebalanceData = await DataSource.select()
        .from(Rebalance)
        .orderBy(desc(Rebalance.timestamp))
        .limit(1);

      if (rebalanceData.length === 0) return [];

      coinIds = (rebalanceData[0].data as AmountPerContracts[]).map(
        (asset) => asset.coinId
      );
    }

    // Batch query to get all assetIds linked to coinIds
    const coinsWithAssetIds = await DataSource.select({
      coinId: Coins.id,
      assetId: Coins.assetId,
      name: Coins.name,
    })
      .from(Coins)
      .where(inArray(Coins.id, coinIds));

    const assetIds = coinsWithAssetIds.map((coin) => coin.assetId);

    // Fetch all SPOT market coins with the same assetId
    const spotCoins = await DataSource.select({
      id: Coins.id,
      name: Coins.name,
    })
      .from(Coins)
      .where(
        and(
          inArray(Coins.assetId, assetIds),
          eq(Coins.source, CoinSourceEnum.SPOT)
        )
      );

    const spotCoinIds = spotCoins.map((coin) => coin.id);

    // Batch query to get all market cap data
    const marketCaps = await DataSource.select({
      coinId: MarketCap.coinId,
      date: sql`DATE_TRUNC('day', ${MarketCap.timestamp})`.as("date"),
      marketCap: MarketCap.marketCap,
    })
      .from(MarketCap)
      .where(
        and(
          inArray(MarketCap.coinId, spotCoinIds),
          gte(MarketCap.timestamp, moment().subtract(1, "year").toDate())
        )
      )
      .orderBy(asc(MarketCap.timestamp));

    // Using a Map for efficient lookups
    const dataMap = new Map<string, any>();

    for (const { coinId, date, marketCap } of marketCaps) {
      const coinName = spotCoins.find((c) => c.id === coinId)?.name;
      if (!coinName) continue;

      const dateStr = moment(date as Date).format("YYYY-MM-DD");

      if (!dataMap.has(dateStr)) {
        dataMap.set(dateStr, { date: moment(date as Date).toDate() });
      }

      const entry = dataMap.get(dateStr)!;

      if (!entry[coinName]) {
        entry[coinName] = { sum: 0, count: 0 };
      }

      entry[coinName].sum += Number(marketCap);
      entry[coinName].count += 1;
    }

    // Convert to final format and compute averages
    const result = Array.from(dataMap.values()).map((entry) => {
      const finalEntry: any = { date: entry.date };
      for (const [key, { sum, count }] of Object.entries(entry) as [
        [string, { sum: number; count: number }]
      ]) {
        if (key !== "date") {
          finalEntry[key] = sum / count;
        }
      }
      return finalEntry;
    });

    return result;
  }
}

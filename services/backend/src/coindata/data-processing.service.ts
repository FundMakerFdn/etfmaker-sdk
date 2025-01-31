import { eq, sql } from "drizzle-orm";
import { and, asc, desc, gte, isNotNull, lte } from "drizzle-orm/expressions";
import { BinanceService } from "../binance/binance.service";
import { DataSource } from "../db/DataSource";
import { Candles, Coins, MarketCap } from "../db/schema";
import { CoinInfoDto } from "./dto/CoinInfo.dto";
import { CoinMarketCapInfoDto } from "./dto/CoinMarketCapInfo.dto";
import { CandleInterface } from "../interfaces/Candle.interface";
import Decimal from "decimal.js";

const binanceService = new BinanceService();

export class DataProcessingService {
  async getRecentCoinsData(coinIds: number[]): Promise<CoinInfoDto[]> {
    const allCoinData = (await DataSource.query.Coins.findMany({
      where: (coins, { inArray }) => inArray(coins.id, coinIds),
      with: {
        funding: {
          orderBy: (f, { desc }) => [desc(f.timestamp)],
          limit: 1,
        },
        marketCap: {
          orderBy: (m, { desc }) => [desc(m.timestamp)],
          limit: 1,
        },
        openInterest: {
          orderBy: (o, { desc }) => [desc(o.timestamp)],
          limit: 1,
        },
      },
    })) as Omit<CoinInfoDto, "price">[] | undefined;

    if (!allCoinData) {
      throw new Error("Coin not found");
    }

    const data = [] as CoinInfoDto[];

    for (const coinData of allCoinData) {
      const price = await binanceService.getCurrentPrice(
        coinData.symbol,
        coinData.source
      );

      data.push({
        ...coinData,
        price: price ?? "",
      });
    }

    return data;
  }

  async getTopCoinsByMarketCap(
    amount: number
  ): Promise<CoinMarketCapInfoDto[]> {
    const topCoins = (await DataSource.select({
      coin: Coins,
      marketCap: MarketCap,
    })
      .from(Coins)
      .leftJoin(MarketCap, eq(MarketCap.coinId, Coins.id))
      .where(isNotNull(MarketCap.marketCap))
      .orderBy(sql`CAST(${MarketCap.marketCap} AS DOUBLE PRECISION) DESC`)
      .limit(amount)) as Partial<CoinMarketCapInfoDto>[];

    if (!topCoins?.length) {
      throw new Error("Top coins not found");
    }

    const allCoinsMarketCapSum = topCoins.reduce(
      (acc, coin) => acc.add(new Decimal(coin.marketCap?.marketCap ?? "0")),
      new Decimal("0")
    );

    for (const coin of topCoins) {
      coin.weight = new Decimal(coin.marketCap?.marketCap ?? "0")
        .div(allCoinsMarketCapSum)
        .toNumber();
    }

    return topCoins as CoinMarketCapInfoDto[];
  }

  async getCoinsPrices(
    coinIds: number[],
    startTime: number,
    endTime: number
  ): Promise<CandleInterface[]> {
    const result = {} as Record<string, { start: any; end: any }>;

    for (const coinId of coinIds) {
      // Fetch the closest record to starttime
      const startRecord = await DataSource.select()
        .from(Candles)
        .where(
          and(
            eq(Candles.coinId, coinId),
            gte(Candles.timestamp, new Date(startTime))
          )
        )
        .orderBy(asc(Candles.timestamp))
        .limit(1);

      // Fetch the closest record to endtime
      const endRecord = await DataSource.select()
        .from(Candles)
        .where(
          and(
            eq(Candles.coinId, coinId),
            lte(Candles.timestamp, new Date(endTime))
          )
        )
        .orderBy(desc(Candles.timestamp))
        .limit(1);

      if (startRecord.length > 0 && endRecord.length > 0) {
        result[coinId] = {
          start: startRecord[0],
          end: endRecord[0],
        };
      }
    }

    console.dir(result, { depth: null });

    return {} as CandleInterface[];
  }
}

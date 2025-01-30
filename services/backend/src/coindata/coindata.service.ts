import { eq } from "drizzle-orm";
import { desc } from "drizzle-orm/expressions";
import { BinanceService } from "../binance/binance.service";
import { CoinGeckoService } from "../coingecko/coingecko.service";
import { DataSource } from "../db/DataSource";
import { Candles, Coins, Funding, MarketCap, OpenInterest } from "../db/tables";
import { CoinSourceEnum } from "../enums/CoinSource.enum";
import { BinanceCoinsDataDto } from "../binance/dto/BinanceCoinsData.dto";
import { CoinInterface } from "../interfaces/CoinType";
import moment from "moment";
import { CoinStatusEnum } from "../enums/CoinStatus.enum";

const coingeckoService = new CoinGeckoService();
const binanceService = new BinanceService();

export class CoinDataService {
  async calculateCoinData() {
    const topCoinList = await coingeckoService.getCoinList();
    const binanceCoinSymbols = await binanceService.getBinanceCoinsData();

    const classifiedCoins = this.classifyCoins(topCoinList, binanceCoinSymbols);

    const coins = await this.updateCoinsTable(classifiedCoins);

    //market cap and open interest are set in parallel, they are using different APIs, can't reach rate limit
    await Promise.all([this.setMarketCap(coins), this.setOpenInterest(coins)]);
    await this.setCandles(coins);
    await this.setFundings(coins);
  }

  private async updateCoinsTable(
    newCoinsData: Omit<CoinInterface, "id">[]
  ): Promise<CoinInterface[]> {
    const coins = (await DataSource.select().from(Coins)) as CoinInterface[];

    //add new coins to list
    for (const newCoin of newCoinsData) {
      const coin = coins.find(
        (c) =>
          c.assetId === newCoin.assetId &&
          c.source === newCoin.source &&
          c.symbol === newCoin.symbol
      );

      if (!coin) {
        await DataSource.insert(Coins).values(newCoin);
      }
    }

    //mark delisted coins
    for (const coin of coins) {
      const isStillListed = !!newCoinsData.find(
        (c) =>
          c.assetId === coin.assetId &&
          c.source === coin.source &&
          c.symbol === coin.symbol
      );
      if (coin.status === CoinStatusEnum.ACTIVE && !isStillListed) {
        await DataSource.update(Coins)
          .set({ status: CoinStatusEnum.DELISTED })
          .where(eq(Coins.id, coin.id));
      }
      if (coin.status === CoinStatusEnum.DELISTED && isStillListed) {
        await DataSource.update(Coins)
          .set({ status: CoinStatusEnum.ACTIVE })
          .where(eq(Coins.id, coin.id));
      }
    }

    return DataSource.select().from(Coins) as Promise<CoinInterface[]>;
  }

  private classifyCoins(
    coinList: Record<string, any>[],
    binanceCoinSymbols: BinanceCoinsDataDto
  ): Omit<CoinInterface, "id">[] {
    const { usdMFutures, coinMFutures, spots } = binanceCoinSymbols;

    const classifiedCoins = coinList.reduce((acc, coin) => {
      const usdMFuturesBinanceData = usdMFutures.get(coin.symbol);
      const coinMFuturesBinanceData = coinMFutures.get(coin.symbol);
      const spotBinanceData = spots.get(coin.symbol);

      if (usdMFuturesBinanceData) {
        acc.push({
          name: coin.name,
          assetId: coin.id,
          source: CoinSourceEnum.USDMFUTURES,
          symbol: usdMFuturesBinanceData.symbol,
          status: CoinStatusEnum.ACTIVE,
          pair: usdMFuturesBinanceData.pair,
        });
      }

      if (coinMFuturesBinanceData) {
        acc.push({
          name: coin.name,
          assetId: coin.id,
          source: CoinSourceEnum.COINMFUTURES,
          symbol: coinMFuturesBinanceData.symbol,
          status: CoinStatusEnum.ACTIVE,
          pair: coinMFuturesBinanceData.pair,
        });
      }

      if (spotBinanceData) {
        acc.push({
          name: coin.name,
          assetId: coin.id,
          source: CoinSourceEnum.SPOT,
          symbol: spotBinanceData.symbol,
          status: CoinStatusEnum.ACTIVE,
        });
      }

      return acc;
    }, []) as Omit<CoinInterface, "id">[];

    return classifiedCoins;
  }

  private async setMarketCap(coins: CoinInterface[]): Promise<void> {
    console.log("Setting market cap data...");

    for (const { assetId, id: coinId, source } of coins) {
      if (!coinId || !assetId || source !== CoinSourceEnum.SPOT) continue;

      const lastMarketCap = (
        await DataSource.select()
          .from(MarketCap)
          .where(eq(MarketCap.coinId, coinId))
          .orderBy(desc(MarketCap.timestamp))
          .limit(1)
      )?.[0];

      let days;

      if (lastMarketCap) {
        const lastMarketCapDate = moment(lastMarketCap.timestamp);
        days = moment().diff(lastMarketCapDate, "days");
      } else {
        days = moment().diff(moment().subtract(60, "months"), "days");
      }

      if (days <= 0) continue;

      try {
        const marketCap = await coingeckoService.getCoinMarketCap(
          assetId,
          days
        );

        if (marketCap.length === 0) continue;

        const insertData = marketCap.map((cap) => ({
          coinId,
          timestamp: new Date(cap.timestamp),
          marketCap: cap.marketCap.toString(),
        }));

        await DataSource.insert(MarketCap).values(insertData);
      } catch (error) {
        console.error(`Error processing coinId ${coinId}:`, error);
      }
    }
  }

  private async setOpenInterest(coins: CoinInterface[]): Promise<void> {
    for (const { symbol, id: coinId, source, pair } of coins) {
      if (!symbol || !coinId || source === CoinSourceEnum.SPOT) continue;

      const lastOpenInterest = (
        await DataSource.select()
          .from(OpenInterest)
          .where(eq(OpenInterest.coinId, coinId))
          .orderBy(desc(OpenInterest.timestamp))
          .limit(1)
      )?.[0];

      let startTime;
      if (lastOpenInterest) {
        const lastOpenInterestDate = moment(lastOpenInterest.timestamp).add(
          moment(1000 * 60 * 60 * 24).valueOf()
        );
        startTime = lastOpenInterestDate.valueOf();
      } else {
        startTime = moment().subtract(30, "days").valueOf();
      }

      if (moment(startTime).get("days") <= 0) continue;

      try {
        const openInterest = await binanceService.getAllOpenInterest(
          symbol,
          source,
          startTime,
          pair
        );
        if (openInterest.length === 0) continue;

        const insertData = openInterest.map((oi) => ({
          coinId,
          timestamp: new Date(oi.timestamp),
          sumOpenInterest: oi.sumOpenInterest.toString(),
          sumOpenInterestValue: oi.sumOpenInterestValue.toString(),
        }));

        await DataSource.insert(OpenInterest).values(insertData);
      } catch (error) {
        console.error(`Error processing symbol ${symbol}:`, error);
      }
    }
  }

  private async setCandles(coins: CoinInterface[]): Promise<void> {
    for (const { symbol, id: coinId, source } of coins) {
      if (!symbol || !coinId) continue;

      const lastCandle = (
        await DataSource.select()
          .from(Candles)
          .where(eq(Candles.coinId, coinId))
          .orderBy(desc(Candles.timestamp))
          .limit(1)
      )?.[0];

      let startTime;
      if (lastCandle) {
        const lastCandleDate = moment(lastCandle.timestamp);
        startTime = lastCandleDate.valueOf();
      } else {
        startTime = moment().subtract(60, "months").valueOf(); //60 months ago
      }

      try {
        const candles = await binanceService.getAllHistoricalCandles(
          source,
          symbol,
          coinId,
          startTime
        );

        if (candles.length === 0) continue;

        const batchSize = 1000;
        for (let i = 0; i < candles.length; i += batchSize) {
          const batch = candles.slice(i, i + batchSize);
          await DataSource.insert(Candles).values(batch);
        }
      } catch (error) {
        console.error(`Error processing symbol ${symbol}:`, error);
      }
    }
  }

  private async setFundings(coins: CoinInterface[]): Promise<void> {
    console.log("Setting fundings data...");

    for (const { symbol, id: coinId, source } of coins) {
      if (!symbol || !coinId || source === CoinSourceEnum.SPOT) continue;

      try {
        const fundingData = await binanceService.getAllFunding(symbol, source);

        if (fundingData.length === 0) continue;

        const insertData = fundingData.map((f) => ({
          coinId,
          timestamp: new Date(f.timestamp),
          fundingRate: f.fundingRate.toString(),
        }));

        await DataSource.insert(Funding).values(insertData);
      } catch (error) {
        console.error(`Error processing symbol ${symbol}:`, error);
      }
    }
  }
}

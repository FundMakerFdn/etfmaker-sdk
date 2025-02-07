import { eq } from "drizzle-orm";
import { desc } from "drizzle-orm/expressions";
import { BinanceService } from "../binance/binance.service";
import { CoinGeckoService } from "../coingecko/coingecko.service";
import { DataSource } from "../db/DataSource";
import { Candles, Coins, Funding, MarketCap, OpenInterest } from "../db/schema";
import { CoinSourceEnum } from "../enums/CoinSource.enum";
import { BinanceCoinsDataDto } from "../binance/dto/BinanceCoinsData.dto";
import { CoinInterface } from "../interfaces/Coin.interface";
import moment from "moment";
import { CoinStatusEnum } from "../enums/CoinStatus.enum";
import { FuturesType } from "../enums/FuturesType.enum";

const coingeckoService = new CoinGeckoService();
const binanceService = new BinanceService();

export class DataActualizationService {
  async actualizeData() {
    const topCoinList = await coingeckoService.getCoinList();
    const binanceCoinSymbols = await binanceService.getBinanceCoinsData();

    const classifiedCoins = this.classifyCoins(topCoinList, binanceCoinSymbols);

    const coins = await this.updateCoinsTable(classifiedCoins);

    await this.setMarketCap(coins);
    await this.setOpenInterest(coins);
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
    // actualize data
    for (const coin of coins) {
      const newCoinData = newCoinsData.find(
        (c) =>
          c.assetId === coin.assetId &&
          c.source === coin.source &&
          c.symbol === coin.symbol
      );
      const updatedData: Partial<Omit<CoinInterface, "id">> = {};

      if (coin.status === CoinStatusEnum.ACTIVE && !newCoinData) {
        await DataSource.update(Coins)
          .set({ status: CoinStatusEnum.DELISTED })
          .where(eq(Coins.id, coin.id));
        updatedData.status = CoinStatusEnum.DELISTED;
      }

      if (coin.status === CoinStatusEnum.DELISTED && !!newCoinData) {
        updatedData.status = CoinStatusEnum.DELISTED;
      }

      if (newCoinData) {
        const updatableKeys: Array<keyof Omit<CoinInterface, "id" | "status">> =
          ["name", "assetId", "source", "symbol", "pair", "futuresType"];

        for (const key of updatableKeys) {
          if (
            newCoinData[key] !== undefined &&
            newCoinData[key] !== null &&
            newCoinData[key] !== coin[key]
          ) {
            updatedData[key] = newCoinData[key] as any;
          }
        }
      }

      if (Object.keys(updatedData).length > 0) {
        await DataSource.update(Coins)
          .set(updatedData)
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
          futuresType: usdMFuturesBinanceData.futuresType,
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
          futuresType: coinMFuturesBinanceData.futuresType,
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

      if (moment().diff(startTime, "days") < 1) continue;

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
    const dataPeriod = 6; //months

    const tasks = [];

    for (const { symbol, id: coinId, source, status } of coins) {
      if (!symbol || !coinId || status === CoinStatusEnum.DELISTED) continue;

      const lastCandle = (
        await DataSource.select()
          .from(Candles)
          .where(eq(Candles.coinId, coinId))
          .orderBy(desc(Candles.timestamp))
          .limit(1)
      )?.[0];

      let startTime;
      if (lastCandle) {
        const lastCandleDate = moment(lastCandle.timestamp).add(1, "minute");
        startTime = lastCandleDate.valueOf();
      } else {
        startTime = moment().subtract(dataPeriod, "months").valueOf();
      }

      if (moment().diff(moment(startTime), "minutes") < 1) continue;

      tasks.push(
        (async () => {
          try {
            await binanceService.getAllHistoricalCandles(
              source,
              symbol,
              coinId,
              startTime
            );
          } catch (error) {
            console.error(`Error processing symbol ${symbol}:`, error);
          }
        })()
      );
    }

    await Promise.all(tasks);
  }

  private async setFundings(coins: CoinInterface[]): Promise<void> {
    console.log("Setting fundings data...");

    for (const { symbol, id: coinId, source, futuresType, status } of coins) {
      if (
        !symbol ||
        !coinId ||
        source === CoinSourceEnum.SPOT ||
        futuresType !== FuturesType.PERPETUAL ||
        status === CoinStatusEnum.DELISTED
      )
        continue;

      const lastFunding = (
        await DataSource.select()
          .from(Funding)
          .where(eq(Funding.coinId, coinId))
          .orderBy(desc(Funding.timestamp))
          .limit(1)
      )?.[0];

      let startTime;
      if (lastFunding) {
        startTime = moment(lastFunding.timestamp).valueOf() + 1;
      } else {
        startTime = moment().subtract(60, "months").valueOf(); //60 months ago
      }

      if (moment().diff(moment(startTime), "hours") < 8) continue;

      try {
        const fundingData = await binanceService.getAllFunding(
          symbol,
          source,
          startTime
        );

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

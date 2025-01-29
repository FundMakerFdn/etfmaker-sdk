import { sql } from "drizzle-orm";
import { BinanceService } from "../binance/binance.service";
import { CoinGeckoService } from "../coingecko/coingecko.service";
import { DataSource } from "../db/DataSource";
import { Candles, Coins, MarketCap, OpenInterest } from "../db/tables";
import { CoinSourceEnum } from "../enums/CoinData.enum";
import { BinanceCoinsDataDto } from "../binance/dto/BinanceCoinsData.dto";
import { CoinInterface } from "../interfaces/CoinType";

const coingeckoService = new CoinGeckoService();
const binanceService = new BinanceService();

export class CoinDataService {
  async calculateCoinData() {
    const topCoinList = await coingeckoService.getCoinList();
    const binanceCoinSymbols = await binanceService.getBinanceCoinsData();

    const classifiedCoins = this.classifyCoins(topCoinList, binanceCoinSymbols);

    await this.resetCoinsTable();
    const coins = await DataSource.insert(Coins)
      .values(classifiedCoins)
      .returning({
        id: Coins.id,
        assetId: Coins.assetId,
        symbol: Coins.symbol,
        source: Coins.source,
        pair: Coins.pair,
      });
    //market cap and open interest are set in parallel, they are using different APIs, can't reach rate limit
    await Promise.all([this.setMarketCap(coins), this.setOpenInterest(coins)]);
    await this.setCandles(coins);
  }

  async updateCandles() {
    const coins = await DataSource.select().from(Coins);

    return await this.setCandles(coins);
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
          pair: usdMFuturesBinanceData.pair,
        });
      }

      if (coinMFuturesBinanceData) {
        acc.push({
          name: coin.name,
          assetId: coin.id,
          source: CoinSourceEnum.COINMFUTURES,
          symbol: coinMFuturesBinanceData.symbol,
          pair: coinMFuturesBinanceData.pair,
        });
      }

      if (spotBinanceData) {
        acc.push({
          name: coin.name,
          assetId: coin.id,
          source: CoinSourceEnum.SPOT,
          symbol: spotBinanceData.symbol,
        });
      }

      return acc;
    }, []) as Omit<CoinInterface, "id">[];

    return classifiedCoins;
  }

  private async setMarketCap(coins: Record<string, any>[]): Promise<void> {
    const tasks: Promise<void>[] = [];

    await this.resetMarketCapTable();

    for (const { assetId, id: coinId, source } of coins) {
      if (!coinId || !assetId || source !== CoinSourceEnum.SPOT) continue;

      tasks.push(
        (async () => {
          try {
            const marketCap = await coingeckoService.getCoinMarketCap(assetId);

            if (marketCap.length === 0) return;

            const insertData = marketCap.map((cap) => ({
              coinId,
              timestamp: new Date(cap.timestamp),
              marketCap: cap.marketCap.toString(),
            }));

            await DataSource.insert(MarketCap).values(insertData);
          } catch (error) {
            console.error(`Error processing coinId ${coinId}:`, error);
          }
        })()
      );
    }

    await Promise.all(tasks);
  }

  private async setOpenInterest(coins: Record<string, any>[]): Promise<void> {
    const tasks: Promise<void>[] = [];

    await this.resetOpenInterestTable();

    for (const { symbol, id: coinId, source, pair } of coins) {
      if (!symbol || !coinId || source === CoinSourceEnum.SPOT) continue;

      tasks.push(
        (async () => {
          try {
            const openInterest = await binanceService.getAllOpenInterest(
              symbol,
              source,
              pair
            );

            if (openInterest.length === 0) return;

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
        })()
      );
    }

    await Promise.all(tasks);
  }

  private async setCandles(coins: Record<string, any>[]): Promise<void> {
    const tasks: Promise<void>[] = [];

    await this.resetCandlesTable();

    for (const { symbol, id: coinId, source } of coins) {
      if (!symbol || !coinId) continue;

      tasks.push(
        (async () => {
          try {
            const candles = await binanceService.getAllHistoricalCandles(
              source,
              symbol,
              coinId
            );

            if (candles.length === 0) return;

            const batchSize = 1000;
            for (let i = 0; i < candles.length; i += batchSize) {
              const batch = candles.slice(i, i + batchSize);
              await DataSource.insert(Candles).values(batch);
            }
          } catch (error) {
            console.error(`Error processing symbol ${symbol}:`, error);
          }
        })()
      );
    }

    await Promise.all(tasks);
  }

  private async resetCoinsTable() {
    await DataSource.execute(
      sql`TRUNCATE TABLE coins RESTART IDENTITY CASCADE;`
    );
  }

  private async resetMarketCapTable() {
    await DataSource.execute(
      sql`TRUNCATE TABLE market_cap RESTART IDENTITY CASCADE;`
    );
  }

  private async resetOpenInterestTable() {
    await DataSource.execute(
      sql`TRUNCATE TABLE open_interest RESTART IDENTITY CASCADE;`
    );
  }

  private async resetCandlesTable() {
    await DataSource.execute(
      sql`TRUNCATE TABLE candles RESTART IDENTITY CASCADE;`
    );
  }
}

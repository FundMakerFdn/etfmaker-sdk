import { sql } from "drizzle-orm";
import { BinanceService } from "../binance/binance.service";
import { CoinGeckoService } from "../coingecko/coingecko.service";
import { DataSource } from "../db/DataSource";
import { Candles, Coins, MarketCap, OpenInterest } from "../db/tables";
import { CoinSourceEnum } from "../enums/CoinData.enum";
import pLimit from "p-limit";
import { sleep } from "../helpers/sleep";

const coingeckoService = new CoinGeckoService();
const binanceService = new BinanceService();

export class CoinDataService {
  async calculateCoinData() {
    const topCoinList = await coingeckoService.getCoinList();
    const futuresCoinSymbols = await binanceService.getFuturesSymbols();

    const classifiedCoins = this.classifyCoins(topCoinList, futuresCoinSymbols);

    const coinsData = classifiedCoins
      .filter((coin) => coin.source !== CoinSourceEnum.UNKNOWN)
      .map((coin) => ({
        name: coin.name,
        symbol: coin.symbol,
        source: coin.source,
        assetId: coin.id,
      }));

    await this.resetCoinsTable();
    const coins = await DataSource.insert(Coins).values(coinsData).returning({
      id: Coins.id,
      assetId: Coins.assetId,
      symbol: Coins.symbol,
    });
    await this.setOpenInterest(coins);
    //market cap and open interest are set in parallel, they are using different APIs, can't reach rate limit
    // await Promise.all([this.setMarketCap(coins), this.setOpenInterest(coins)]);
    // await this.setCandles(coins);
  }

  private classifyCoins(
    coinList: Record<string, any>[],
    binanceFuturesCoinSymbols: Record<string, any>[]
  ): Record<string, any>[] {
    const futuresTokens = binanceFuturesCoinSymbols
      .filter(
        (symbol) =>
          symbol.contractType === "PERPETUAL" && symbol.status === "TRADING"
      )
      .map((symbol) => symbol.baseAsset.toUpperCase());

    const spotTokens = binanceFuturesCoinSymbols
      .filter((symbol) => !symbol.contractType && symbol.status === "TRADING")
      .map((symbol) => symbol.baseAsset.toUpperCase());

    const classifiedCoins = coinList.map((coin) => {
      let source = CoinSourceEnum.UNKNOWN;

      if (futuresTokens.includes(coin.symbol)) {
        source = CoinSourceEnum.FUTURES;
      } else if (spotTokens.includes(coin.symbol)) {
        source = CoinSourceEnum.SPOT;
      }

      return {
        ...coin,
        source,
      };
    });

    return classifiedCoins;
  }

  private async setMarketCap(coins: Record<string, any>[]): Promise<void> {
    const limit = pLimit(10);
    const tasks: Promise<void>[] = [];

    await this.resetMarketCapTable();

    for (let i = 0; i < coins.length; i++) {
      const { assetId, id: coinId } = coins[i];
      if (!coinId || !assetId) continue;

      tasks.push(
        limit(async () => {
          try {
            await sleep(i % 10 === 0 ? 1000 : 100);

            console.log(`Processing market cap for coinId ${coinId}...`);

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
        })
      );
    }

    await Promise.all(tasks);
  }

  private async setOpenInterest(coins: Record<string, any>[]): Promise<void> {
    const limit = pLimit(10);
    const tasks: Promise<void>[] = [];

    await this.resetOpenInterestTable();

    for (let i = 0; i < coins.length; i++) {
      const { symbol, id: coinId } = coins[i];
      if (!symbol || !coinId) continue;

      tasks.push(
        limit(async () => {
          try {
            await sleep(i % 10 === 0 ? 1000 : 100);

            console.log(`Processing open interest for coinId ${coinId}...`);

            const openInterest = await binanceService.getAllOpenInterest(
              symbol
            );

            console.log(symbol, openInterest);

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
        })
      );
    }

    await Promise.all(tasks);
  }

  private async setCandles(coins: Record<string, any>[]): Promise<void> {
    const limit = pLimit(10);
    const tasks: Promise<void>[] = [];

    await this.resetCandlesTable();

    for (let i = 0; i < coins.length; i++) {
      const { symbol, id: coinId } = coins[i];
      if (!symbol || !coinId) continue;

      tasks.push(
        limit(async () => {
          try {
            await sleep(i % 10 === 0 ? 1000 : 100);

            console.log(`Processing candles for coinId ${coinId}...`);

            const candles = await binanceService.getAllHistoricalCandles(
              symbol
            );

            if (candles.length === 0) return;

            const insertData = candles.map((candle) => ({
              coinId,
              timestamp: new Date(candle.timestamp),
              open: candle.open.toString(),
              high: candle.high.toString(),
              low: candle.low.toString(),
              close: candle.close.toString(),
              volume: candle.volume.toString(),
            }));

            await DataSource.insert(Candles).values(insertData);
          } catch (error) {
            console.error(`Error processing symbol ${symbol}:`, error);
          }
        })
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

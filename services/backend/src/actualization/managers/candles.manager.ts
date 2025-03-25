import { eq, desc } from "drizzle-orm";
import moment from "moment";
import { DataSource } from "../../db/DataSource";
import { Candles } from "../../db/schema/candles";
import { CoinStatusEnum } from "../../enums/CoinStatus.enum";
import { CoinInterface } from "../../interfaces/Coin.interface";
import { BinanceService } from "../../binance/binance.service";

const binanceService = new BinanceService();

export const setCandlesData = async (coins: CoinInterface[]): Promise<void> => {
  const dataPeriod = 60; //months

  const globalProgress = new Map<number, number>();
  const coinsLength = coins.length;

  const updateGlobalProgress = (coinId: number, progress: number) => {
    globalProgress.set(coinId, progress);
    const totalProgress = Array.from(globalProgress.values()).reduce(
      (acc, curr) => acc + curr,
      0
    );
    const overallProgress = totalProgress / coinsLength;
    console.log(`Overall progress: ${overallProgress.toFixed(5)}%`);
  };

  const tasks = [];

  for (let i = 0; i < coinsLength; i++) {
    const { symbol, id: coinId, source, status } = coins[i];
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
          await binanceService.setAllHistoricalCandles(
            source,
            symbol,
            coinId,
            startTime,
            updateGlobalProgress
          );
        } catch (error) {
          console.error(`Error processing symbol ${symbol}:`, error);
        }
      })()
    );
  }

  await Promise.all(tasks);
};

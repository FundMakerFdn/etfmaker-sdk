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
  console.log("Fetching candles data...");

  const tasks = [];

  const coinsLength = coins.length;
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
            startTime
          );

          const percent = (i / coinsLength) * 100;
          console.log("Fetching candles data..." + percent.toFixed(2) + "%");
        } catch (error) {
          console.error(`Error processing symbol ${symbol}:`, error);
        }
      })()
    );
  }

  await Promise.all(tasks);
};

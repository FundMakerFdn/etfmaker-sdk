import { eq, desc } from "drizzle-orm";
import moment from "moment";
import { DataSource } from "../../db/DataSource";
import { OpenInterest } from "../../db/schema";
import { CoinSourceEnum } from "../../enums/CoinSource.enum";
import { CoinInterface } from "../../interfaces/Coin.interface";
import { BinanceService } from "../../binance/binance.service";

const binanceService = new BinanceService();

export const setOpenInterestData = async (
  coins: CoinInterface[]
): Promise<void> => {
  const lastCoinId = coins[coins.length - 1].id;
  console.log("Fetching open interest data...");

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
      await binanceService.setAllOpenInterest(coinId, symbol, startTime);

      const percent = (coinId / lastCoinId) * 100;
      console.log("Fetching open interest data..." + percent.toFixed(2) + "%");
    } catch (error) {
      console.error(`Error processing symbol ${symbol}:`, error);
    }
  }
};

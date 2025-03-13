import { eq, desc } from "drizzle-orm";
import moment from "moment";
import { DataSource } from "../../db/DataSource";
import { CoinSourceEnum } from "../../enums/CoinSource.enum";
import { CoinStatusEnum } from "../../enums/CoinStatus.enum";
import { FuturesType } from "../../enums/FuturesType.enum";
import { CoinInterface } from "../../interfaces/Coin.interface";
import { BinanceService } from "../../binance/binance.service";
import { Funding } from "../../db/schema";

const binanceService = new BinanceService();

export const setFundingsData = async (
  coins: CoinInterface[]
): Promise<void> => {
  console.log("Fetching fundings data...");

  const coinsLength = coins.length;

  for (let i = 0; i < coinsLength; i++) {
    const { symbol, id: coinId, source, futuresType, status } = coins[i];
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
      await binanceService.setAllFunding(coinId, symbol, startTime);
      const percent = (i / coinsLength) * 100;
      console.log("Fetching fundings data..." + percent.toFixed(2) + "%");
    } catch (error) {
      console.error(`Error processing symbol ${symbol}:`, error);
    }
  }
};

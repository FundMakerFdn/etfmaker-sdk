import { eq, desc } from "drizzle-orm";
import moment from "moment";
import { DataSource } from "../../db/DataSource";
import { CoinSourceEnum } from "../../enums/CoinSource.enum";
import { CoinInterface } from "../../interfaces/Coin.interface";
import { CoinGeckoService } from "../../coingecko/coingecko.service";
import { MarketCap } from "../../db/schema";

const coingeckoService = new CoinGeckoService();

export const setMarketCapData = async (
  coins: CoinInterface[]
): Promise<void> => {
  console.log("Fetching market cap data...");
  const tasks = [];

  const coinsLength = coins.length;
  for (let i = 0; i < coinsLength; i++) {
    const { assetId, id: coinId, source } = coins[i];
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

    tasks.push(
      (async () => {
        try {
          await coingeckoService.setCoinMarketCap(assetId, coinId, days);
          const percent = (i / coinsLength) * 100;
          console.log("Fetching market cap data..." + percent.toFixed(2) + "%");
        } catch (error) {
          console.error(`Error processing coinId ${coinId}:`, error);
        }
      })()
    );
  }

  await Promise.all(tasks);
};

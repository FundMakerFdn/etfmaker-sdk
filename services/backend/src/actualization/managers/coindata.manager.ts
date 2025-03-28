import { eq } from "drizzle-orm";
import { CoinGeckoService } from "../../coingecko/coingecko.service";
import { DataSource } from "../../db/DataSource";
import { CoinInterface } from "../../interfaces/Coin.interface";
import { Coins } from "../../db/schema";
import { CoinStatusEnum } from "../../enums/CoinStatus.enum";

const coingeckoService = new CoinGeckoService();

export const setCoinsCategories = async (coins: CoinInterface[]) => {
  const tasks = [];

  for (const coin of coins) {
    if (
      //   coin.status === CoinStatusEnum.DELISTED ||
      Array.isArray(coin?.categories) &&
      coin?.categories?.length > 0
    )
      continue;

    tasks.push(
      (async () => {
        const allCoinData = await coingeckoService.getAllCoinData(coin.assetId);
        coin.categories = allCoinData.categories;

        await DataSource.update(Coins)
          .set({ categories: coin.categories })
          .where(eq(Coins.assetId, coin.assetId));
      })()
    );
  }

  await Promise.all(tasks);
};

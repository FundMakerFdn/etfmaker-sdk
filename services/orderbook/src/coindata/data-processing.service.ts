import { DataSource } from "../db/DataSource";
import { Coins } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { CoinInterface } from "../interfaces/Coin.interface";
import { CoinSourceEnum } from "../enums/CoinSource.enum";
import { CoinStatusEnum } from "../enums/CoinStatus.enum";

export class DataProcessingService {
  async getAllSpotUsdtPairs(): Promise<CoinInterface[]> {
    return DataSource.select()
      .from(Coins)
      .where(
        and(
          eq(Coins.source, CoinSourceEnum.USDMFUTURES),
          sql`${Coins.pair} ~ '(USDT|USDC)$'`,
          eq(Coins.status, CoinStatusEnum.ACTIVE)
        )
      ) as Promise<CoinInterface[]>;
  }
}

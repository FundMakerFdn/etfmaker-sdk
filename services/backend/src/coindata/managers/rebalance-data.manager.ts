import { eq, desc, and, lte, gte, isNotNull, sql } from "drizzle-orm";
import moment from "moment";
import { DataSource } from "../../db/DataSource";
import { Coins, Rebalance, MarketCap } from "../../db/schema";
import { getRebalanceIntervalMs } from "../../helpers/GetRebalanceIntervalMs";
import { RebalanceConfig } from "../../interfaces/RebalanceConfig.interface";
import { ETFDataManager } from "./etf-data.manager";
import { CoinInterface } from "../../interfaces/Coin.interface";
import { RebalanceDto } from "../../interfaces/Rebalance.interface";

export class RebalanceDataManager {
  public static async generateRebalanceData(
    config: RebalanceConfig
  ): Promise<Omit<RebalanceDto, "id">[]> {
    const rebalanceData = [] as Omit<RebalanceDto, "id">[];

    const amountOfCoins = Number(RegExp(/\d+/).exec(config.etfId)?.[0] ?? 0);

    const coins = await this.getTopCoinsByMarketCap(
      amountOfCoins,
      config.startDate,
      new Date()
    );

    const rebalancePeriodMs = getRebalanceIntervalMs(config.etfId);

    const latestBalanceData = await DataSource.select()
      .from(Rebalance)
      .where(eq(Rebalance.etfId, config.etfId))
      .orderBy(desc(Rebalance.timestamp))
      .limit(1);

    let startTime =
      latestBalanceData.length > 0
        ? moment(latestBalanceData[0]?.timestamp)
            .add(rebalancePeriodMs)
            .valueOf()
        : moment(config.startDate).valueOf();
    let endTime = moment(startTime).add(rebalancePeriodMs).valueOf();

    const today = moment().valueOf();
    if (moment(endTime).isAfter(today)) endTime = today.valueOf();

    let price = config.initialPrice;

    while (startTime < endTime) {
      const coinsWithPrices = await ETFDataManager.getCoinsPriceStartEndRecords(
        coins.map((coin) => coin.id),
        startTime,
        endTime
      );

      if (coinsWithPrices.length === 0) {
        throw new Error(
          `No coins with prices found for period ${moment(
            startTime
          ).toISOString()} - ${moment(endTime).toISOString()}`
        );
      }

      const assetsWithWeights = ETFDataManager.setAssetWeights(coinsWithPrices);
      const amountPerContracts = ETFDataManager.setAmountPerContracts(
        assetsWithWeights,
        config.initialPrice
      );

      const etfCandle = ETFDataManager.getCloseETFPrice(
        price,
        amountPerContracts
      );

      price = Number(etfCandle?.close ?? price);

      rebalanceData.push({
        etfId: config.etfId,
        timestamp: new Date(startTime),
        price: price.toString(),
        data: amountPerContracts,
      });

      startTime = endTime;
      endTime = moment(endTime).add(rebalancePeriodMs).valueOf();
      if (moment(endTime).isAfter(today)) break;
    }

    return rebalanceData;
  }

  private static async getTopCoinsByMarketCap(
    amount: number,
    startTimestamp: Date,
    endTimestamp: Date
  ): Promise<CoinInterface[]> {
    const result = await DataSource.select({
      coin: Coins,
    })
      .from(Coins)
      .leftJoin(MarketCap, eq(MarketCap.coinId, Coins.id))
      .where(
        and(
          isNotNull(MarketCap.marketCap),
          gte(MarketCap.timestamp, new Date(startTimestamp)),
          lte(MarketCap.timestamp, new Date(endTimestamp))
        )
      )
      .orderBy(sql`CAST(${MarketCap.marketCap} AS DOUBLE PRECISION) DESC`)
      .limit(amount);

    return result.map((coin) => coin.coin) as CoinInterface[];
  }
}

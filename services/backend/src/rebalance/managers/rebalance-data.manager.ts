import {
  eq,
  desc,
  and,
  lte,
  gte,
  sql,
  notInArray,
  inArray,
  isNull,
} from "drizzle-orm";
import moment from "moment";
import { DataSource } from "../../db/DataSource";
import { getRebalanceIntervalMs } from "../../helpers/GetRebalanceIntervalMs";
import { RebalanceConfig } from "../../interfaces/RebalanceConfig.interface";
import { ETFDataManager } from "../../coindata/managers/etf-data.manager";
import { CoinInterface } from "../../interfaces/Coin.interface";
import {
  AmountPerContracts,
  RebalanceDto,
} from "../../interfaces/Rebalance.interface";
import blacklistCoins from "../../config/blacklist.json";
import Decimal from "decimal.js";
import { CoinSourceEnum } from "../../enums/CoinSource.enum";
import { Rebalance, Coins, MarketCap } from "../../db/schema";

export class RebalanceDataManager {
  public static async getRebalanceAssets(): Promise<CoinInterface[]> {
    const assets = await DataSource.select()
      .from(Rebalance)
      .orderBy(desc(Rebalance.timestamp))
      .limit(1)
      .then((data) => {
        if (data.length === 0) return [];
        return data[0].data as AmountPerContracts[];
      });

    return DataSource.select()
      .from(Coins)
      .where(
        inArray(
          Coins.id,
          assets.map((asset) => asset.coinId)
        )
      ) as Promise<CoinInterface[]>;
  }

  public static async getLatestRebalanceData(): Promise<RebalanceDto> {
    return (
      await DataSource.select()
        .from(Rebalance)
        .orderBy(desc(Rebalance.timestamp))
        .limit(1)
    )?.[0] as RebalanceDto;
  }

  public static async getAssetRebalanceWeight(coinId: number): Promise<number> {
    const rebalanceData = (
      await DataSource.select()
        .from(Rebalance)
        .orderBy(desc(Rebalance.timestamp))
        .limit(1)
    )?.[0] as RebalanceDto;

    if (!rebalanceData) {
      throw new Error("No rebalance data found");
    }

    const asset = rebalanceData.data.find((asset) => asset.coinId === coinId);

    if (!asset) {
      throw new Error(`No asset found for coinId ${coinId}`);
    }

    return asset.weight;
  }

  public static async generateRebalanceData(
    config: RebalanceConfig,
    returnData = false
  ): Promise<RebalanceDto[] | void> {
    const amountOfCoins = Number(RegExp(/\d+/).exec(config.etfId)?.[0] ?? 0);

    const coins = await this.getTopUsdmCoinsByMarketCap(
      amountOfCoins,
      config.startDate,
      new Date()
    );

    const rebalancePeriodMs = getRebalanceIntervalMs(config.etfId);

    let latestBalanceData;

    if (config?.category) {
      latestBalanceData = await DataSource.select()
        .from(Rebalance)
        .where(
          and(
            eq(Rebalance.etfId, config.etfId),
            eq(Rebalance.coinCategory, config?.category)
          )
        )
        .orderBy(desc(Rebalance.timestamp))
        .limit(1);
    } else {
      latestBalanceData = await DataSource.select()
        .from(Rebalance)
        .where(
          and(eq(Rebalance.etfId, config.etfId), isNull(Rebalance.coinCategory))
        )
        .orderBy(desc(Rebalance.timestamp))
        .limit(1);
    }

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

    const etfDataManager = new ETFDataManager();

    while (startTime < endTime) {
      const coinsWithPrices = await etfDataManager.getCoinsPriceStartEndRecords(
        coins.map((coin) => coin.id),
        startTime,
        endTime
      );

      if (coinsWithPrices.length > 0) {
        const assetsWithWeights = await etfDataManager.setAssetWeights(
          coinsWithPrices
        );
        const amountPerContracts = etfDataManager.setAmountPerContracts(
          assetsWithWeights,
          config.initialPrice
        );

        const etfCandle = etfDataManager.getCloseETFPrice(
          price,
          amountPerContracts
        );

        price =
          Number(etfCandle?.close ?? price) > 0
            ? Number(etfCandle?.close ?? price)
            : 0;
        if (price > 0) {
          const data = {
            etfId: config.etfId,
            timestamp: new Date(startTime),
            price: price.toString(),
            data: amountPerContracts,
            coinCategory: config?.category,
          } satisfies Omit<RebalanceDto, "id">;

          if (config?.category) data.coinCategory = config.category;

          await DataSource.insert(Rebalance).values([data]);
        }
      }
      startTime = endTime;
      endTime = moment(endTime).add(rebalancePeriodMs).valueOf();
      if (moment(endTime).isAfter(today)) break;
    }

    if (returnData) {
      return DataSource.select()
        .from(Rebalance)
        .where(eq(Rebalance.etfId, config.etfId)) as Promise<RebalanceDto[]>;
    }
  }

  public static async setRebalanceDataManualy(
    timestamp: number,
    weights: { coinId: number; weight: number }[],
    config: RebalanceConfig
  ): Promise<RebalanceDto[]> {
    const rebalanceData = (await DataSource.select({
      id: Rebalance.id,
      data: Rebalance.data,
      price: Rebalance.price,
    })
      .from(Rebalance)
      .where(gte(Rebalance.timestamp, new Date(timestamp)))) as Pick<
      RebalanceDto,
      "id" | "data" | "price"
    >[];

    if (rebalanceData.length === 0) {
      throw new Error(`No rebalance data found for timestamp ${timestamp}`);
    }

    const coinIds = rebalanceData
      .map((rebalance) => rebalance.data.map((asset) => asset.coinId))
      .flat();

    const marketCaps = await DataSource.select({
      coinId: MarketCap.id,
      marketCap: MarketCap.marketCap,
    })
      .from(MarketCap)
      .where(inArray(MarketCap.id, coinIds));

    const marketCapMap = new Map(
      marketCaps.map((mc) => [mc.coinId, new Decimal(mc.marketCap)])
    );

    const weightsMap = new Map(
      weights.map((weight) => [
        weight.coinId,
        weight.weight > 0.0025 ? weight.weight : 0.0025,
      ])
    );

    const remainToRecalculate = new Decimal(1).minus(
      weights.reduce((acc, w) => new Decimal(w.weight).add(acc), new Decimal(0))
    );

    const totalMarketCap = marketCaps.reduce((acc, mc) => {
      return acc.add(new Decimal(mc.marketCap));
    }, new Decimal(0));
    let price = Number(rebalanceData[0].price);

    for (const rebalance of rebalanceData) {
      const data = [] as AmountPerContracts[];
      for (const asset of rebalance.data) {
        const weight = weightsMap.get(asset.coinId);
        if (weight) {
          data.push({
            ...asset,
            weight,
          });
          continue;
        }
        data.push(asset);
      }

      const result = [] as AmountPerContracts[];
      for (const asset of data) {
        const marketCap = marketCapMap.get(asset.coinId);

        if (!weightsMap.has(asset.coinId) && marketCap) {
          const weight = marketCap.div(totalMarketCap.mul(remainToRecalculate));

          result.push({
            ...asset,
            weight: weight.toNumber(),
            amountPerContracts: Decimal(config.initialPrice)
              .mul(weight)
              .div(new Decimal(asset.startTime.close))
              .toNumber(),
          });

          continue;
        }

        result.push({
          ...asset,
          amountPerContracts: Decimal(config.initialPrice)
            .mul(new Decimal(asset.weight ?? 0.0025))
            .div(new Decimal(asset.startTime.close))
            .toNumber(),
        });
      }

      const etfDataManager = new ETFDataManager();

      const etfCandle = etfDataManager.getCloseETFPrice(price, result);

      price = Number(etfCandle?.close ?? price);

      await DataSource.update(Rebalance)
        .set({ data: result, price: price.toString() })
        .where(eq(Rebalance.id, rebalance.id));
    }

    return DataSource.select()
      .from(Rebalance)
      .where(gte(Rebalance.timestamp, new Date(timestamp))) as Promise<
      RebalanceDto[]
    >;
  }

  public static async setRebalanceSpread(
    etfId: RebalanceConfig["etfId"],
    spread: number
  ): Promise<void> {
    await DataSource.update(Rebalance)
      .set({ spread: spread.toString() })
      .where(eq(Rebalance.etfId, etfId));
  }

  private static async getTopUsdmCoinsByMarketCap(
    amount: number,
    startTimestamp: Date,
    endTimestamp: Date
  ): Promise<CoinInterface[]> {
    const topMarketCaps = await DataSource.select({
      coinId: MarketCap.coinId,
      latestMarketCap: sql`MAX(${MarketCap.marketCap})`.as("latestMarketCap"),
    })
      .from(MarketCap)
      .where(
        and(
          gte(MarketCap.timestamp, new Date(startTimestamp)),
          lte(MarketCap.timestamp, new Date(endTimestamp))
        )
      )
      .groupBy(MarketCap.coinId)
      .orderBy(sql`CAST(MAX(${MarketCap.marketCap}) AS DOUBLE PRECISION) DESC`)
      .limit(amount);

    const topCoinIds = topMarketCaps.map((entry) => entry.coinId);

    const spotsAssetIds = await DataSource.select({
      assetId: Coins.assetId,
    })
      .from(Coins)
      .where(
        and(
          inArray(Coins.id, topCoinIds),
          notInArray(Coins.symbol, blacklistCoins)
        )
      );

    return DataSource.select()
      .from(Coins)
      .where(
        and(
          eq(Coins.source, CoinSourceEnum.USDMFUTURES),
          inArray(
            Coins.assetId,
            spotsAssetIds.map((asset) => asset.assetId)
          ),
          sql`${Coins.pair} ~ '(USDT|USDC)$'`
        )
      ) as Promise<CoinInterface[]>;
  }
}

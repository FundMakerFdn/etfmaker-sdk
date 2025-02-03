import { eq, sql } from "drizzle-orm";
import { and, asc, desc, gte, isNotNull, lte } from "drizzle-orm/expressions";
import { BinanceService } from "../binance/binance.service";
import { DataSource } from "../db/DataSource";
import { Candles, Coins, MarketCap, Rebalance } from "../db/schema";
import { CoinInfoDto } from "./dto/CoinInfo.dto";
import { CoinMarketCapInfoDto } from "./dto/CoinMarketCapInfo.dto";
import Decimal from "decimal.js";
import { CloseETFPrices } from "./dto/CloseETFPricesFutures.dto";
import {
  RebalanceConfig,
  rebalancePeriod,
} from "../interfaces/RebalanceConfig.interface";
import moment from "moment";
import {
  AmountPerContracts,
  AssetWeights,
  PricesDto,
} from "../interfaces/Rebalance.interface";

const binanceService = new BinanceService();

export class DataProcessingService {
  async generateRebalanceData(config: RebalanceConfig): Promise<void> {
    const amountOfCoins = Number(RegExp(/\d+/).exec(config.etfId)?.[0] ?? 0);

    const coins = await DataSource.select().from(Coins).limit(amountOfCoins);

    const rebalancePeriodMs = this.getRepalancePeriodMs(config.rebalancePeriod);

    const newestBalanceData = await DataSource.select()
      .from(Rebalance)
      .where(eq(Rebalance.etfId, config.etfId))
      .orderBy(desc(Rebalance.timestamp))
      .limit(1);

    let startTime =
      newestBalanceData.length > 0
        ? moment(newestBalanceData[0]?.timestamp)
            .add(rebalancePeriodMs)
            .valueOf()
        : moment(config.startDate).valueOf();
    let endTime = moment(startTime).add(rebalancePeriodMs).valueOf();

    const today = moment().valueOf();
    if (moment(endTime).isAfter(today)) endTime = today.valueOf();

    while (startTime < endTime) {
      const prices = await this.getCoinsPrices(
        coins.map((coin) => coin.id),
        startTime,
        endTime
      );
      console.log({ prices });

      const assetsWithWeights = await this.setAssetWeights(prices);
      const amountPerContracts = await this.setAmountPerContracts(
        assetsWithWeights,
        config.initialPrice
      );

      await DataSource.insert(Rebalance).values({
        etfId: config.etfId,
        timestamp: new Date(startTime),
        price: config.initialPrice.toString(),
        data: amountPerContracts,
      });

      startTime = endTime;
      endTime = moment(endTime).add(rebalancePeriodMs).valueOf();
      if (moment(endTime).isAfter(today)) endTime = today.valueOf();
    }
  }

  async getRecentCoinsData(coinIds: number[]): Promise<CoinInfoDto[]> {
    const allCoinData = (await DataSource.query.Coins.findMany({
      where: (coins, { inArray }) => inArray(coins.id, coinIds),
      with: {
        funding: {
          orderBy: (f, { desc }) => [desc(f.timestamp)],
          limit: 1,
        },
        marketCap: {
          orderBy: (m, { desc }) => [desc(m.timestamp)],
          limit: 1,
        },
        openInterest: {
          orderBy: (o, { desc }) => [desc(o.timestamp)],
          limit: 1,
        },
      },
    })) as Omit<CoinInfoDto, "price">[] | undefined;

    if (!allCoinData) {
      throw new Error("Coin not found");
    }

    const data = [] as CoinInfoDto[];

    for (const coinData of allCoinData) {
      const price = await binanceService.getCurrentPrice(
        coinData.symbol,
        coinData.source
      );

      data.push({
        ...coinData,
        price: price ?? "",
      });
    }

    return data;
  }

  async getTopCoinsByMarketCap(
    amount: number
  ): Promise<CoinMarketCapInfoDto[]> {
    const topCoins = (await DataSource.select({
      coin: Coins,
      marketCap: MarketCap,
    })
      .from(Coins)
      .leftJoin(MarketCap, eq(MarketCap.coinId, Coins.id))
      .where(isNotNull(MarketCap.marketCap))
      .orderBy(sql`CAST(${MarketCap.marketCap} AS DOUBLE PRECISION) DESC`)
      .limit(amount)) as Partial<CoinMarketCapInfoDto>[];

    if (!topCoins?.length) {
      throw new Error("Top coins not found");
    }

    const allCoinsMarketCapSum = topCoins.reduce(
      (acc, coin) => acc.add(new Decimal(coin.marketCap?.marketCap ?? "0")),
      new Decimal("0")
    );

    for (const coin of topCoins) {
      coin.weight = new Decimal(coin.marketCap?.marketCap ?? "0")
        .div(allCoinsMarketCapSum)
        .toNumber();
    }

    return topCoins as CoinMarketCapInfoDto[];
  }

  async getCoinsPrices(
    coinIds: number[],
    startTime: number,
    endTime: number
  ): Promise<PricesDto[]> {
    const result = [] as PricesDto[];

    for (const coinId of coinIds) {
      // Fetch the closest record to starttime
      const startRecord = await DataSource.select()
        .from(Candles)
        .where(
          and(
            eq(Candles.coinId, coinId),
            lte(Candles.timestamp, new Date(startTime))
          )
        )
        .orderBy(desc(Candles.timestamp))
        .limit(1);

      // Fetch the closest record to endtime
      const endRecord = await DataSource.select()
        .from(Candles)
        .where(
          and(
            eq(Candles.coinId, coinId),
            gte(Candles.timestamp, new Date(endTime))
          )
        )
        .orderBy(asc(Candles.timestamp))
        .limit(1);

      if (startRecord.length > 0 && endRecord.length > 0) {
        result.push({
          coinId,
          startTime: startRecord[0],
          endTime: endRecord[0],
        });
      }
    }

    return result;
  }

  async setAssetWeights(assetsList: PricesDto[]): Promise<AssetWeights[]> {
    const amount = assetsList.length;
    return assetsList.map((asset) => ({
      ...asset,
      weight: Decimal(1).div(amount).toNumber(),
    }));
  }

  async setAmountPerContracts(
    assetsListWithWeights: AssetWeights[],
    etfPrice: number
  ): Promise<AmountPerContracts[]> {
    return assetsListWithWeights.map((asset) => ({
      ...asset,
      amountPerContracts: Decimal(etfPrice)
        .mul(new Decimal(asset.weight))
        .div(new Decimal(asset.startTime.close))
        .toNumber(),
    }));
  }

  async getCloseETFPrice(
    assetsAmountPerContracts: AmountPerContracts[],
    startTime: number,
    endTime: number
  ): Promise<CloseETFPrices> {
    const response = {
      open: new Decimal(0),
      high: new Decimal(0),
      low: new Decimal(0),
      close: new Decimal(0),
    };

    for (const asset of assetsAmountPerContracts) {
      const amountDecimal = new Decimal(asset.amountPerContracts);
      const baselineDecimal = new Decimal(asset.startTime.close);

      const pnlOpen = new Decimal(asset.startTime.open)
        .sub(baselineDecimal)
        .mul(amountDecimal);
      const pnlHigh = new Decimal(asset.startTime.high)
        .sub(baselineDecimal)
        .mul(amountDecimal);
      const pnlLow = new Decimal(asset.startTime.low)
        .sub(baselineDecimal)
        .mul(amountDecimal);
      const pnlClose = new Decimal(asset.endTime.close)
        .sub(baselineDecimal)
        .mul(amountDecimal);

      response.open = response.open.add(pnlOpen);
      response.high = response.high.add(pnlHigh);
      response.low = response.low.add(pnlLow);
      response.close = response.close.add(pnlClose);
    }
    return {
      open: response.open.toString(),
      high: response.high.toString(),
      low: response.low.toString(),
      close: response.close.toString(),
    };
  }

  private getRepalancePeriodMs(rebalancePeriod: rebalancePeriod): number {
    return {
      "1h": 60 * 60 * 1000,
      "1d": 24 * 60 * 60 * 1000,
      "1w": 7 * 24 * 60 * 60 * 1000,
      "1m": 30 * 24 * 60 * 60 * 1000,
      "1y": 365 * 24 * 60 * 60 * 1000,
    }[rebalancePeriod];
  }
}

import { eq, sql } from "drizzle-orm";
import { and, asc, desc, gte, isNotNull } from "drizzle-orm/expressions";
import { BinanceService } from "../binance/binance.service";
import { DataSource } from "../db/DataSource";
import {
  Coins,
  EtfFundingReward,
  EtfPrice,
  Funding,
  MarketCap,
  Rebalance,
} from "../db/schema";
import { CoinInfoDto } from "./dto/CoinInfo.dto";
import { CoinMarketCapInfoDto } from "./dto/CoinMarketCapInfo.dto";
import Decimal from "decimal.js";
import { CloseETFPrices } from "./dto/CloseETFPricesFutures.dto";
import { RebalanceConfig } from "../interfaces/RebalanceConfig.interface";
import moment from "moment";
import { AmountPerContracts } from "../interfaces/Rebalance.interface";
import { RebalanceCsvManager } from "./managers/rebalance-csv.manager";
import { ApyDataManager } from "./managers/apy-data.manager";
import { FundingDataManager } from "./managers/funding-data.manager";
import { RebalanceDataManager } from "./managers/rebalance-data.manager";

const binanceService = new BinanceService();

export class DataProcessingService {
  async getETFPrices(): Promise<
    { time: number; open: string; high: string; low: string; close: string }[]
  > {
    return (await DataSource.select().from(EtfPrice)).map((etfPrice) => ({
      time: etfPrice.timestamp.getTime(),
      open: etfPrice.open,
      high: etfPrice.high,
      low: etfPrice.low,
      close: etfPrice.close,
    }));
  }

  async getBackingSystem(): Promise<{
    [assetName: string]: { time: number; value: number }[];
  }> {
    const rebalanceData = await DataSource.select()
      .from(Rebalance)
      .orderBy(desc(Rebalance.timestamp))
      .limit(1);

    if (rebalanceData.length === 0) return {};

    const backingSystem = {} as {
      [assetName: string]: { time: number; value: number }[];
    };

    for (const asset of rebalanceData[0].data as AmountPerContracts[]) {
      const coin = await DataSource.select()
        .from(Coins)
        .where(eq(Coins.id, asset.coinId))
        .limit(1);

      if (coin.length === 0) continue;

      backingSystem[coin[0].name] = (
        await DataSource.select()
          .from(MarketCap)
          .where(eq(MarketCap.coinId, asset.coinId))
          .orderBy(asc(MarketCap.timestamp))
      ).map((marketCap) => ({
        time: marketCap.timestamp.getTime(),
        value: Number(marketCap.marketCap),
      }));
    }

    return backingSystem;
  }

  getRebalanceDataCsv(): Promise<string> {
    return RebalanceCsvManager.getRebalanceDataCsv();
  }

  fundingRewardAPY(): Promise<{ time: number; value: number }[]> {
    return ApyDataManager.fundingRewardAPY();
  }

  sUSDeApy(): Promise<{ time: number; value: number }[]> {
    return ApyDataManager.sUSDeApy();
  }

  getAverageYieldQuartalFundingRewardData(): Promise<
    { quarter: string; avgYield: number }[]
  > {
    return FundingDataManager.getAverageYieldQuartalFundingRewardData();
  }

  getAverageFundingChartData(): Promise<{
    [assetName: string]: { time: number; value: number }[];
  }> {
    return FundingDataManager.getAverageFundingChartData();
  }

  async generateRebalanceData(config: RebalanceConfig): Promise<void> {
    return RebalanceDataManager.generateRebalanceData(config);
  }

  async generateETFPrice(etfId: RebalanceConfig["etfId"]): Promise<void> {
    const rebalanceData = await DataSource.select()
      .from(Rebalance)
      .where(eq(Rebalance.etfId, etfId))
      .orderBy(asc(Rebalance.timestamp));

    if (rebalanceData.length === 0) {
      throw new Error("Rebalance data not found");
    }

    for (const data of rebalanceData) {
      let startTime = moment(data.timestamp).valueOf();

      const closeETFPrice = this.getCloseETFPrice(
        data.data as AmountPerContracts[]
      );

      await DataSource.insert(EtfPrice).values({
        etfId,
        timestamp: new Date(startTime),
        open: closeETFPrice.open,
        high: closeETFPrice.high,
        low: closeETFPrice.low,
        close: closeETFPrice.close,
      });
    }
  }

  async setYieldETFFundingReward(
    etfId: RebalanceConfig["etfId"]
  ): Promise<void> {
    const rebalanceData = await DataSource.select()
      .from(Rebalance)
      .where(eq(Rebalance.etfId, etfId));

    if (rebalanceData.length === 0) {
      throw new Error("Rebalance data not found");
    }

    for (const rebalance of rebalanceData) {
      let fundingReward = new Decimal(0);

      for (const asset of rebalance.data as AmountPerContracts[]) {
        const fundingRate = await DataSource.select()
          .from(Funding)
          .where(
            and(
              eq(Funding.coinId, asset.coinId),
              gte(Funding.timestamp, new Date(rebalance.timestamp))
            )
          )
          .orderBy(desc(Funding.timestamp))
          .limit(1);

        if (fundingRate.length === 0) {
          continue;
        }
        fundingReward = fundingReward.add(
          new Decimal(fundingRate[0]?.fundingRate ?? "0")
            .mul(new Decimal(asset.amountPerContracts))
            .div(100)
        );
      }

      await DataSource.insert(EtfFundingReward).values({
        etfId: rebalance.etfId,
        timestamp: rebalance.timestamp,
        reward: fundingReward.toString(),
      });
    }
  }

  private async getRecentCoinsData(coinIds: number[]): Promise<CoinInfoDto[]> {
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

  private async getTopCoinsByMarketCap(
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

  private getCloseETFPrice(
    assetsAmountPerContracts: AmountPerContracts[]
  ): CloseETFPrices {
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
}

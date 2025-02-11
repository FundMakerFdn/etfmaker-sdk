import { BinanceService } from "../binance/binance.service";
import { DataSource } from "../db/DataSource";
import { Candles, EtfPrice, Rebalance } from "../db/schema";
import { CoinInfoDto } from "./dto/CoinInfo.dto";
import { RebalanceConfig } from "../interfaces/RebalanceConfig.interface";
import { RebalanceCsvManager } from "./managers/rebalance-csv.manager";
import { ApyDataManager } from "./managers/apy-data.manager";
import { FundingDataManager } from "./managers/funding-data.manager";
import { RebalanceDataManager } from "./managers/rebalance-data.manager";
import { ChartDataManager } from "./managers/charts-data.manager";
import { ETFDataManager } from "./managers/etf-data.manager";
import { CoinInterface } from "../interfaces/Coin.interface";
import { asc, eq, and, gte } from "drizzle-orm";
import { ProcessingStatusService } from "../processing-status/processing-status.service";
import { ProcessingKeysEnum } from "../enums/Processing.enum";
import orderBookProducerService from "../orderbook/orderbook.producer.service";

const binanceService = new BinanceService();

export class DataProcessingService {
  async getETFPrices(): Promise<
    { time: number; open: string; high: string; low: string; close: string }[]
  > {
    return (
      await DataSource.selectDistinctOn([EtfPrice.timestamp])
        .from(EtfPrice)
        .orderBy(asc(EtfPrice.timestamp))
    ).map((etfPrice) => ({
      time: etfPrice.timestamp.getTime() / 1000,
      open: etfPrice.open,
      high: etfPrice.high,
      low: etfPrice.low,
      close: etfPrice.close,
    }));
  }

  async getCoinOhclData(
    coinId: number
  ): Promise<
    { time: number; open: string; high: string; low: string; close: string }[]
  > {
    return (
      await DataSource.selectDistinctOn([Candles.timestamp])
        .from(Candles)
        .where(
          and(
            eq(Candles.coinId, coinId),
            gte(
              Candles.timestamp,
              new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)
            )
          )
        )
        .orderBy(asc(Candles.timestamp))
    ).map((candle) => ({
      time: candle.timestamp.getTime() / 1000,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));
  }

  getBackingSystemData(coinId?: number): Promise<{
    [assetName: string]: { time: number; value: number }[];
  }> {
    return ChartDataManager.getBackingSystemData(coinId);
  }

  getRebalanceAssets(): Promise<CoinInterface[]> {
    return RebalanceDataManager.getRebalanceAssets();
  }

  getRebalanceDataCsv(): Promise<string> {
    return RebalanceCsvManager.getRebalanceDataCsv();
  }

  simulateRebalanceDataCSV(config: RebalanceConfig): Promise<string> {
    return RebalanceCsvManager.simulateRebalanceDataCSV(config);
  }

  fundingRewardAPY(): Promise<{ time: number; value: number }[]> {
    return ApyDataManager.fundingRewardAPY();
  }

  getCoinFundingAPY(
    coinId: number
  ): Promise<{ time: number; value: number }[]> {
    return ApyDataManager.coinFundingAPY(coinId);
  }

  sUSDeApy(): Promise<{ time: number; value: number }[]> {
    return ApyDataManager.sUSDeApy();
  }

  getAverageYieldQuartalFundingRewardData(): Promise<
    { quarter: number; avgYield: number }[]
  > {
    return FundingDataManager.getAverageYieldQuartalFundingRewardData();
  }

  getAverageYieldQuartalFundingAssetData(
    coinId: number
  ): Promise<{ quarter: number; avgYield: number }[]> {
    return FundingDataManager.getAverageYieldQuartalFundingAssetData(coinId);
  }

  getAverageFundingChartData(): Promise<{
    [assetName: string]: { time: number; value: number }[];
  }> {
    return FundingDataManager.getAverageFundingChartData();
  }

  getAssetFundingChartData(
    coinId: number
  ): Promise<{ [assetName: string]: { time: number; value: number }[] }> {
    return FundingDataManager.getAssetFundingChartData(coinId);
  }

  async generateRebalanceData(config: RebalanceConfig): Promise<void> {
    if (
      await ProcessingStatusService.isProcessing(ProcessingKeysEnum.processing)
    ) {
      return;
    }

    try {
      await ProcessingStatusService.setProcessing(
        ProcessingKeysEnum.processing
      );
      const rebalanceData = await RebalanceDataManager.generateRebalanceData(
        config
      );

      await DataSource.insert(Rebalance).values(rebalanceData);

      await orderBookProducerService.openStreamOrderBook();

      await ProcessingStatusService.setSuccess(ProcessingKeysEnum.processing);
    } catch (error) {
      await ProcessingStatusService.setError(ProcessingKeysEnum.processing);
      throw error;
    }
  }

  getFundingDaysDistributionChartData(coinId?: number): Promise<{
    positive: number;
    negative: number;
  }> {
    return FundingDataManager.getFundingDaysDistributionChartData(coinId);
  }

  generateETFPrice(etfId: RebalanceConfig["etfId"]): Promise<void> {
    return ETFDataManager.generateETFPrice(etfId);
  }

  setYieldETFFundingReward(etfId: RebalanceConfig["etfId"]): Promise<void> {
    return ETFDataManager.setYieldETFFundingReward(etfId);
  }

  setRebalanceDataManualy() {
    return RebalanceDataManager.setRebalanceDataManualy(
      1738928704000,
      [{ coinId: 3, weight: 0.07 }],
      {
        etfId: "top20IndexHourly",
        startDate: new Date(1738928704000),
        initialPrice: 100,
      }
    );
  }

  getSUSDeSpreadVs3mTreasury(
    coinId?: number
  ): Promise<{ time: number; value: number }[]> {
    return ChartDataManager.getSUSDeSpreadVs3mTreasury(coinId);
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
}

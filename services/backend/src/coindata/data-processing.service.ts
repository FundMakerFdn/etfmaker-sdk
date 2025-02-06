import { BinanceService } from "../binance/binance.service";
import { DataSource } from "../db/DataSource";
import { EtfPrice, Rebalance } from "../db/schema";
import { CoinInfoDto } from "./dto/CoinInfo.dto";
import { RebalanceConfig } from "../interfaces/RebalanceConfig.interface";
import { RebalanceCsvManager } from "./managers/rebalance-csv.manager";
import { ApyDataManager } from "./managers/apy-data.manager";
import { FundingDataManager } from "./managers/funding-data.manager";
import { RebalanceDataManager } from "./managers/rebalance-data.manager";
import { ChartDataManager } from "./managers/charts-data.manager";
import { ETFDataManager } from "./managers/etf-data.manager";

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

  getBackingSystemData(): Promise<{
    [assetName: string]: { time: number; value: number }[];
  }> {
    return ChartDataManager.getBackingSystemData();
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
    const rebalanceData = await RebalanceDataManager.generateRebalanceData(
      config
    );
    await DataSource.insert(Rebalance).values(rebalanceData);
  }

  getFundingDaysDistributionChartData(): Promise<{
    positive: number;
    negative: number;
  }> {
    return FundingDataManager.getFundingDaysDistributionChartData();
  }

  generateETFPrice(etfId: RebalanceConfig["etfId"]): Promise<void> {
    return ETFDataManager.generateETFPrice(etfId);
  }

  setYieldETFFundingReward(etfId: RebalanceConfig["etfId"]): Promise<void> {
    return ETFDataManager.setYieldETFFundingReward(etfId);
  }

  getSUSDeSpreadVs3mTreasury(): Promise<{ time: number; value: number }[]> {
    return ChartDataManager.getSUSDeSpreadVs3mTreasury();
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

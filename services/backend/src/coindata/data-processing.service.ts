import { BinanceService } from "../binance/binance.service";
import { DataSource } from "../db/DataSource";
import { CoinInfoDto } from "./dto/CoinInfo.dto";
import { RebalanceConfig } from "../interfaces/RebalanceConfig.interface";
import { ApyDataManager } from "./managers/apy-data.manager";
import { FundingDataManager } from "./managers/funding-data.manager";
import { ChartDataManager } from "./managers/charts-data.manager";
import { asc, eq, and, gte, sql, lte } from "drizzle-orm";
import { CoinInterface } from "../interfaces/Coin.interface";
import { CoinSourceEnum } from "../enums/CoinSource.enum";
import { CoinStatusEnum } from "../enums/CoinStatus.enum";
import { SUSDApyReturnDto } from "./dto/SUSDApy.dto";
import { FilterInterface } from "../interfaces/FilterInterface";
import { Candles } from "../db/schema/candles";
import { Coins } from "../db/schema/coins";

const binanceService = new BinanceService();

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

  async getCoinOhclData(
    coinId: number,
    from?: string,
    to?: string
  ): Promise<
    { time: number; open: string; high: string; low: string; close: string }[]
  > {
    let data;

    if (from && to) {
      data = await DataSource.select()
        .from(Candles)
        .where(
          and(
            eq(Candles.coinId, coinId),
            gte(Candles.timestamp, new Date(+from * 1000)),
            lte(Candles.timestamp, new Date(+to * 1000))
          )
        )
        .orderBy(asc(Candles.timestamp));
    }

    if (!data || data.length === 0) {
      data = await DataSource.selectDistinctOn([Candles.timestamp])
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
        .orderBy(asc(Candles.timestamp));
    }

    return data.map((candle) => ({
      time: candle.timestamp.getTime() / 1000,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));
  }

  getBackingSystemData(coinId?: number): Promise<any[]> {
    return ChartDataManager.getBackingSystemData(coinId);
  }

  fundingRewardAPY(
    etfId: RebalanceConfig["etfId"]
  ): Promise<{ time: Date; value: number }[]> {
    return ApyDataManager.fundingRewardAPY(etfId);
  }

  getCoinFundingAPY(
    coinId: number
  ): Promise<{ time: number; value: number }[]> {
    return ApyDataManager.coinFundingAPY(coinId);
  }

  sUSDeApy(etfId: RebalanceConfig["etfId"]): Promise<SUSDApyReturnDto[]> {
    return ApyDataManager.sUSDeApy(etfId);
  }

  getAverageYieldQuartalFundingRewardData(
    etfId: RebalanceConfig["etfId"]
  ): Promise<{ quarter: string; avgYield: number }[]> {
    return FundingDataManager.getAverageYieldQuartalFundingRewardData(etfId);
  }

  getAverageYieldQuartalFundingAssetData(
    coinId: number
  ): Promise<{ quarter: number; avgYield: number }[]> {
    return FundingDataManager.getAverageYieldQuartalFundingAssetData(coinId);
  }

  getAverageFundingChartData(etfId: RebalanceConfig["etfId"]): Promise<any[]> {
    return FundingDataManager.getAverageFundingChartData(etfId);
  }

  getAssetFundingChartData(
    coinId: number
  ): Promise<{ [assetName: string]: { time: number; value: number }[] }> {
    return FundingDataManager.getAssetFundingChartData(coinId);
  }

  getFundingDaysDistributionChartData(
    coinId?: number,
    etfId?: RebalanceConfig["etfId"],
    period?: FilterInterface["period"]
  ): Promise<{
    positive: number;
    negative: number;
  }> {
    return FundingDataManager.getFundingDaysDistributionChartData(
      coinId,
      etfId,
      period
    );
  }

  getSUSDeSpreadVs3mTreasury(
    etfId: RebalanceConfig["etfId"],
    coinId?: number,
    period?: FilterInterface["period"]
  ): Promise<{ time: Date; value: number }[]> {
    return ChartDataManager.getSUSDeSpreadVs3mTreasury(etfId, coinId, period);
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

import { eq, sql } from "drizzle-orm";
import { and, asc, desc, gte, isNotNull, lte } from "drizzle-orm/expressions";
import { BinanceService } from "../binance/binance.service";
import { DataSource } from "../db/DataSource";
import {
  Candles,
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
import {
  AmountPerContracts,
  AssetWeights,
  PricesDto,
} from "../interfaces/Rebalance.interface";

const binanceService = new BinanceService();

export class DataProcessingService {
  async getETFPrices(): Promise<CloseETFPrices[]> {
    return DataSource.select().from(EtfPrice);
  }

  async APY(): Promise<{ timestamp: number; cumulativeApy: number }[]> {
    const fundingRewards = await DataSource.select()
      .from(EtfFundingReward)
      .orderBy(asc(EtfFundingReward.timestamp));

    if (fundingRewards.length === 0) return [];

    const etfId = fundingRewards[0].etfId;
    const updatePeriodMs = this.getPeriodMs(etfId as RebalanceConfig["etfId"]);

    const amountOfUpdates = new Decimal(1000 * 60 * 60 * 24 * 365).div(
      updatePeriodMs
    );

    const apyTimeSeries = [];

    for (const event of fundingRewards) {
      const reward = new Decimal(event.reward);
      const APY = reward.plus(1).pow(amountOfUpdates).sub(1);
      apyTimeSeries.push({
        timestamp: event.timestamp.getTime(),
        cumulativeApy: APY.toNumber(),
      });
    }
    return apyTimeSeries;
  }

  async generateRebalanceData(config: RebalanceConfig): Promise<void> {
    const amountOfCoins = Number(RegExp(/\d+/).exec(config.etfId)?.[0] ?? 0);

    const coins = await DataSource.select().from(Coins).limit(amountOfCoins);

    const rebalancePeriodMs = this.getPeriodMs(config.etfId);

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
      const coinsWithPrices = await this.getCoinsPrices(
        // coins.map((coin) => coin.id),
        [43, 4, 7, 54],
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

      const assetsWithWeights = this.setAssetWeights(coinsWithPrices);
      const amountPerContracts = this.setAmountPerContracts(
        assetsWithWeights,
        config.initialPrice
      );

      const etfCandle = this.getCloseETFPrice(amountPerContracts);

      price = Number(etfCandle?.close ?? price);

      await DataSource.insert(Rebalance).values({
        etfId: config.etfId,
        timestamp: new Date(startTime),
        price: price.toString(),
        data: amountPerContracts,
      });

      startTime = endTime;
      endTime = moment(endTime).add(rebalancePeriodMs).valueOf();
      if (moment(endTime).isAfter(today)) break;
    }
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

  private async getCoinsPrices(
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

  private setAssetWeights(assetsList: PricesDto[]): AssetWeights[] {
    const amount = assetsList.length;
    return assetsList.map((asset) => ({
      ...asset,
      weight: Decimal(1).div(amount).toNumber(),
    }));
  }

  private setAmountPerContracts(
    assetsListWithWeights: AssetWeights[],
    etfPrice: number
  ): AmountPerContracts[] {
    return assetsListWithWeights.map((asset) => ({
      ...asset,
      amountPerContracts: Decimal(etfPrice)
        .mul(new Decimal(asset.weight))
        .div(new Decimal(asset.startTime.close))
        .toNumber(),
    }));
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

  private getPeriodMs(etfId: RebalanceConfig["etfId"]): number {
    const rebalancePeriod = RegExp(/(Yearly|Monthly|Weekly|Daily|Hourly)/).exec(
      etfId
    )?.[0];
    if (!rebalancePeriod) throw new Error("Invalid etfId");

    const periodMs = {
      Hourly: 60 * 60 * 1000,
      Daily: 24 * 60 * 60 * 1000,
      Weekly: 7 * 24 * 60 * 60 * 1000,
      Monthly: 30 * 24 * 60 * 60 * 1000,
      Yearly: 365 * 24 * 60 * 60 * 1000,
    }[rebalancePeriod];

    if (!periodMs) throw new Error("Invalid etfId");

    return periodMs;
  }
}

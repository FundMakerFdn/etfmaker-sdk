import Decimal from "decimal.js";
import {
  eq,
  and,
  gte,
  desc,
  inArray,
  asc,
  lte,
  gt,
  lt,
  sql,
} from "drizzle-orm";
import moment from "moment";
import { DataSource } from "../../db/DataSource";
import {
  AmountPerContracts,
  AssetWeights,
  PricesDto,
} from "../../interfaces/Rebalance.interface";
import { RebalanceConfig } from "../../interfaces/RebalanceConfig.interface";
import { CloseETFPrices } from "../dto/CloseETFPricesFutures.dto";
import path from "path";
import { WorkerPool } from "../../helpers/WorkerPool";
import { EtfPrice } from "../../db/schema/etfPrice";
import {
  Rebalance,
  Candles,
  EtfFundingReward,
  Funding,
  MarketCap,
  Coins,
} from "../../db/schema";
import { CoinSourceEnum } from "../../enums/CoinSource.enum";
import { ProcessingStatusService } from "../../processing-status/processing-status.service";

export class IndexGenerateManager {
  etf_price: number;
  etfId: RebalanceConfig["etfId"] | null;

  constructor(etfId: RebalanceConfig["etfId"] | null = null) {
    this.etf_price = 0;
    this.etfId = etfId;
  }

  public async generateETFPrice(
    etfId: RebalanceConfig["etfId"]
  ): Promise<void> {
    const rebalanceData = await DataSource.select()
      .from(Rebalance)
      .where(eq(Rebalance.etfId, etfId))
      .orderBy(desc(Rebalance.timestamp))
      .limit(1);

    if (rebalanceData.length === 0) {
      await ProcessingStatusService.setIndexNoRebalanceDataError(etfId);
      throw new Error("Rebalance data not found");
    }
    await ProcessingStatusService.setRebalanceIndexProcessing(etfId);

    const rebalanceAssets = rebalanceData[0].data as AmountPerContracts[];
    const coinIds = rebalanceAssets.map((asset) => asset.coinId);

    const lastCandleDataLimit =
      (
        await DataSource.select({ timestamp: Candles.timestamp })
          .from(Candles)
          .where(inArray(Candles.coinId, coinIds))
          .orderBy(desc(Candles.timestamp))
          .limit(1)
      )?.[0]?.timestamp ?? moment();

    const firstCandleDataStart =
      (
        await DataSource.select({
          timestamp: Candles.timestamp,
        })
          .from(Candles)
          .where(inArray(Candles.coinId, coinIds))
          .orderBy(asc(Candles.timestamp))
          .limit(1)
      )?.[0]?.timestamp ?? moment();

    const startTime = moment(firstCandleDataStart);

    const endTime = moment(startTime).add(1, "minute");

    this.etf_price = +rebalanceData[0].price;

    const totalMinutes = Math.abs(endTime.diff(lastCandleDataLimit, "minutes"));

    const pool = new WorkerPool(
      path.resolve(__dirname, "../workers/etf-price/historical.processing.js"),
      32,
      128
    );
    let completedTasks = 0;
    const resultsAccumulator: any[] = [];
    let finishAll: (value?: unknown) => void;
    const allTasksDone = new Promise((resolve) => {
      finishAll = resolve;
    });

    for (let i = 0; i < totalMinutes; i++) {
      const taskData = {
        coinIds,
        startTime: startTime.valueOf(),
        endTime: endTime.valueOf(),
        price: +rebalanceData[0].price,
        timestamp: startTime.toDate(),
        etfId: this.etfId,
      };

      pool
        .runTask(taskData)
        .then((result) => {
          if (result && !result.error && result.result) {
            resultsAccumulator.push(result.result);
          }
        })
        .catch((error) => {
          console.error("Task error:", error);
        })
        .finally(() => {
          completedTasks++;

          if (resultsAccumulator.length >= 50_000) {
            this.bulkInsertAmountsPerContracts(resultsAccumulator).catch(
              (err) => console.error("Bulk insert error:", err)
            );
            resultsAccumulator.length = 0;
          }

          if (completedTasks === totalMinutes) {
            finishAll();
          }
        });

      startTime.add(1, "minute");
      endTime.add(1, "minute");
    }

    // Wait until every task is finished.
    await allTasksDone;

    // Process any leftover results.
    if (resultsAccumulator.length > 0) {
      await this.bulkInsertAmountsPerContracts(resultsAccumulator);
    }

    await ProcessingStatusService.setIndexEtfPriceSuccess(etfId);

    // Clean up the worker pool.
    await pool.destroy();
  }

  public async setYieldETFFundingReward(
    etfId: RebalanceConfig["etfId"]
  ): Promise<void> {
    await ProcessingStatusService.setEtfFundingRewardIndexProcessing(etfId);

    const lastRewardDate = (
      await DataSource.select({
        timestamp: EtfFundingReward.timestamp,
      })
        .from(EtfFundingReward)
        .where(eq(EtfFundingReward.etfId, etfId))
        .orderBy(desc(EtfFundingReward.timestamp))
        .limit(1)
    )?.[0]?.timestamp;

    const whereParams = [eq(Rebalance.etfId, etfId)];
    if (lastRewardDate) {
      whereParams.push(gt(Rebalance.timestamp, lastRewardDate));
    }

    const rebalanceData = await DataSource.select()
      .from(Rebalance)
      .where(and(...whereParams));

    if (rebalanceData.length === 0) {
      await ProcessingStatusService.setIndexNoRebalanceDataError(etfId);
      return;
    }

    for (const rebalance of rebalanceData) {
      let fundingReward = new Decimal(0);

      for (const asset of rebalance.data as AmountPerContracts[]) {
        const assetId = (
          await DataSource.select({ assetId: Coins.assetId })
            .from(Coins)
            .where(eq(Coins.id, asset.coinId))
            .limit(1)
        )?.[0]?.assetId;

        if (!assetId) {
          continue;
        }

        const usdmCoinId = (
          await DataSource.select({ coinId: Coins.id })
            .from(Coins)
            .where(
              and(
                eq(Coins.assetId, assetId),
                eq(Coins.source, CoinSourceEnum.USDMFUTURES)
              )
            )
            .limit(1)
        )?.[0]?.coinId;

        if (!usdmCoinId) {
          continue;
        }

        const fundingRate = await DataSource.select()
          .from(Funding)
          .where(
            and(
              eq(Funding.coinId, usdmCoinId),
              gte(Funding.timestamp, rebalance.timestamp)
            )
          )
          .orderBy(desc(Funding.timestamp))
          .limit(1);

        if (fundingRate.length === 0) {
          continue;
        }
        fundingReward = fundingReward.add(
          new Decimal(fundingRate[0]?.fundingRate ?? "0").mul(
            new Decimal(asset.amountPerContracts)
          )
        );
      }

      await DataSource.insert(EtfFundingReward).values({
        etfId: rebalance.etfId,
        timestamp: rebalance.timestamp,
        reward: fundingReward.toString(),
      });
    }

    await ProcessingStatusService.setIndexEtfFundingRewardSuccess(etfId);
  }

  public getCloseETFPrice(
    previousETFPrice: number,
    assetsAmountPerContracts: AmountPerContracts[]
  ): CloseETFPrices {
    const previousPrice = new Decimal(previousETFPrice);
    let weightedReturnSum = new Decimal(0);
    let validAssetCount = 0;

    for (const asset of assetsAmountPerContracts) {
      if (
        !asset.startTime ||
        !asset.endTime ||
        asset.startTime.close == null ||
        asset.endTime.close == null
      ) {
        continue;
      }

      if (asset.startTime.timestamp === asset.endTime.timestamp) {
        continue;
      }

      let startClose: Decimal, endClose: Decimal;
      try {
        startClose = new Decimal(asset.startTime.close);
        endClose = new Decimal(asset.endTime.close);
      } catch (e) {
        continue;
      }

      if (!startClose.isFinite() || startClose.eq(0) || !endClose.isFinite()) {
        continue;
      }

      const weight = new Decimal(asset.weight);

      const r = endClose.div(startClose).sub(1);
      weightedReturnSum = weightedReturnSum.add(weight.mul(r));

      validAssetCount++;
    }

    if (validAssetCount === 0) {
      return {
        open: previousPrice.toString(),
        high: previousPrice.toString(),
        low: previousPrice.toString(),
        close: previousPrice.toString(),
      };
    }

    const newPrice = previousPrice.mul(new Decimal(1).add(weightedReturnSum));
    const open = previousPrice;
    const close = newPrice;
    const high = Decimal.max(open, close);
    const low = Decimal.min(open, close);

    return {
      open: open.isNaN() ? "" : open.toString(),
      high: high.isNaN() ? "" : high.toString(),
      low: low.isNaN() ? "" : low.toString(),
      close: close.isNaN() ? "" : close.toString(),
    };
  }

  public async getCoinsPriceStartEndRecords(
    coinIds: number[],
    startTime: number,
    endTime: number
  ): Promise<PricesDto[]> {
    const result = [] as PricesDto[];

    for (const coinId of coinIds) {
      // Fetch the closest record to starttime
      let startRecord = await DataSource.select()
        .from(Candles)
        .where(
          and(
            eq(Candles.coinId, coinId),
            lte(Candles.timestamp, new Date(startTime))
            // gt(
            //   Candles.timestamp,
            //   new Date(new Date(startTime).getTime() - 2 * 60 * 1000)
            // )
          )
        )
        .orderBy(desc(Candles.timestamp))
        .limit(1);

      if (startRecord.length === 0) continue;

      let endRecord = await DataSource.select()
        .from(Candles)
        .where(
          and(
            eq(Candles.coinId, coinId),
            gte(Candles.timestamp, new Date(endTime))
            // lt(
            //   Candles.timestamp,
            //   new Date(new Date(endTime).getTime() + 2 * 60 * 1000)
            // )
          )
        )
        .orderBy(asc(Candles.timestamp))
        .limit(1);

      if (endRecord.length === 0) continue;

      result.push({
        coinId,
        startTime: startRecord[0],
        endTime: endRecord[0],
      });
    }

    return result;
  }

  public async setAssetWeights(
    assetsList: PricesDto[],
    startTime: number,
    endTime: number
  ): Promise<AssetWeights[]> {
    const coinIds = assetsList.map((asset) => asset.coinId);

    const marketCaps = await DataSource.selectDistinctOn([MarketCap.coinId], {
      coinId: MarketCap.coinId,
      marketCap: MarketCap.marketCap,
      timestamp: MarketCap.timestamp,
    })
      .from(MarketCap)
      .where(
        and(
          inArray(MarketCap.coinId, coinIds),
          lte(MarketCap.timestamp, new Date(endTime))
        )
      )
      .orderBy(
        MarketCap.coinId,
        sql`CASE WHEN ${MarketCap.timestamp} >= ${new Date(
          startTime
        )} THEN 1 ELSE 2 END`,
        desc(MarketCap.timestamp)
      );

    const marketCapMap = new Map(
      marketCaps.map((mc) => [mc.coinId, new Decimal(mc.marketCap)])
    );

    const totalMarketCap = marketCaps.reduce(
      (acc, curr) => acc.plus(curr.marketCap),
      new Decimal(0)
    );

    const minWeight = new Decimal(0.0025);

    let fixedTotalWeight = new Decimal(0);
    const adjustedWeights = assetsList.map((asset) => {
      const marketCap = marketCapMap.get(asset.coinId) || new Decimal(0);
      const rawWeight = marketCap.div(totalMarketCap);

      if (rawWeight.lessThan(minWeight)) {
        fixedTotalWeight = fixedTotalWeight.plus(minWeight);
        return { asset, weight: minWeight };
      }

      return { asset, weight: null };
    });

    const remainingWeight = new Decimal(1).minus(fixedTotalWeight);
    const remainingMarketCap = adjustedWeights
      .filter((entry) => entry.weight === null)
      .reduce(
        (acc, entry) =>
          acc.plus(marketCapMap.get(entry.asset.coinId) || new Decimal(0)),
        new Decimal(0)
      );

    const finalWeights = adjustedWeights.map((entry) => {
      if (entry.weight !== null) {
        return {
          ...entry.asset,
          weight: entry.weight.toNumber(),
        };
      }

      const marketCap = marketCapMap.get(entry.asset.coinId) || new Decimal(0);
      const redistributedWeight = marketCap
        .div(remainingMarketCap)
        .times(remainingWeight);

      return {
        ...entry.asset,
        weight: redistributedWeight.toNumber(),
      };
    });

    return finalWeights;
  }

  public setAmountPerContracts(
    assetsListWithWeights: AssetWeights[],
    etfPrice: number
  ): AmountPerContracts[] {
    const result = [] as AmountPerContracts[];

    for (const asset of assetsListWithWeights) {
      let price;
      for (const p of [
        asset.startTime.close,
        asset.endTime.open,
        asset.endTime.close,
        asset.startTime.open,
      ]) {
        price = new Decimal(p);
        if (!price.eq(0)) break;
      }

      if (!price) continue;
      result.push({
        ...asset,
        amountPerContracts: Decimal(etfPrice)
          .mul(new Decimal(asset.weight))
          .div(price)
          .toNumber(),
      });
    }

    return result;
  }

  private async bulkInsertAmountsPerContracts(
    amountPerContractsData: {
      amountPerContracts: AmountPerContracts[];
      timestamp: Date;
    }[]
  ): Promise<void> {
    const data = [];
    for (let i = 0; i < amountPerContractsData.length; i++) {
      const { amountPerContracts, timestamp } = amountPerContractsData[i];
      const etfCandle = this.getCloseETFPrice(
        this.etf_price,
        amountPerContracts
      );

      this.etf_price = etfCandle?.close
        ? Number(etfCandle.close)
        : this.etf_price;

      if (
        [etfCandle.open, etfCandle.close, etfCandle.high, etfCandle.low].every(
          (value) => value !== ""
        )
      ) {
        data.push({
          etfId: this.etfId as string,
          timestamp,
          open: etfCandle.open,
          high: etfCandle.high,
          low: etfCandle.low,
          close: etfCandle.close,
        });
      }

      if (i >= 10_000 || i >= amountPerContractsData.length - 1) {
        await DataSource.insert(EtfPrice).values(data).onConflictDoNothing();
        data.length = 0;
      }
    }
  }
}

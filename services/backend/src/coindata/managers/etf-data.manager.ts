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
} from "../../db/schema";
import { OhclGroupByEnum } from "../../enums/OhclGroupBy.enum";

const groupIntervalMapping: Record<OhclGroupByEnum, string> = {
  "1m": "1 minute",
  "3m": "3 minutes",
  "5m": "5 minutes",
  "15m": "15 minutes",
  "30m": "30 minutes",
  "1h": "1 hour",
  "2h": "2 hours",
  "4h": "4 hours",
  "8h": "8 hours",
  "12h": "12 hours",
  "1d": "1 day",
  "3d": "3 days",
  "1w": "1 week",
  "1M": "1 month",
};

const IS_DEV = process.env.NODE_ENV === "development";

export class ETFDataManager {
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
      throw new Error("Rebalance data not found");
    }

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

    const lastETFPriceTimestamp = (
      await DataSource.select({
        timestamp: EtfPrice.timestamp,
        close: EtfPrice.close,
      })
        .from(EtfPrice)
        .where(eq(EtfPrice.etfId, etfId))
        .orderBy(desc(EtfPrice.timestamp))
        .limit(1)
    )?.[0];

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

    const startTime = lastETFPriceTimestamp?.timestamp
      ? moment(lastETFPriceTimestamp.timestamp).add(1, "minute")
      : moment(firstCandleDataStart).add(1, "minute");

    const endTime = moment(startTime).add(1, "minute");

    this.etf_price = +rebalanceData[0].price;

    const totalMinutes = Math.abs(endTime.diff(lastCandleDataLimit, "minutes"));

    const workerFilePath = IS_DEV
      ? path.resolve(
          __dirname,
          "../workers/etf-price/etf-price.processing.bootstrap.mjs"
        )
      : path.resolve(__dirname, "../workers/etf-price/etf-price.processing.js");

    const pool = new WorkerPool(workerFilePath, 128, 192);
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

    // Clean up the worker pool.
    await pool.destroy();
  }

  public async setYieldETFFundingReward(
    etfId: RebalanceConfig["etfId"]
  ): Promise<void> {
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
      whereParams.push(gte(Rebalance.timestamp, lastRewardDate));
    }

    const rebalanceData = await DataSource.select()
      .from(Rebalance)
      .where(and(...whereParams));

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
        asset.startTime.id == null ||
        asset.endTime.id == null ||
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
            lte(Candles.timestamp, new Date(startTime)),
            gt(
              Candles.timestamp,
              new Date(new Date(startTime).getTime() - 2 * 60 * 1000)
            )
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
            gte(Candles.timestamp, new Date(endTime)),
            lt(
              Candles.timestamp,
              new Date(new Date(endTime).getTime() + 2 * 60 * 1000)
            )
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
    assetsList: PricesDto[]
  ): Promise<AssetWeights[]> {
    const coinIds = assetsList.map((asset) => asset.coinId);

    const marketCaps = await DataSource.select({
      coinId: MarketCap.id,
      marketCap: MarketCap.marketCap,
    })
      .from(MarketCap)
      .where(inArray(MarketCap.id, coinIds));

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

  public async getEtfPriceDataGroupedRange(
    groupBy: OhclGroupByEnum,
    from?: string,
    to?: string
  ) {
    let startDate = 0;
    let endDate = new Date().getTime();

    if (from && to) {
      startDate = new Date(from).getTime();
      endDate = new Date(to).getTime();
    }

    const interval = groupIntervalMapping[groupBy];

    const conditions = [
      // sql`${EtfPrice.etfId} = ${etfId}`,
      startDate
        ? sql`${EtfPrice.timestamp} >= ${new Date(startDate).toISOString()}`
        : undefined,
      endDate
        ? sql`${EtfPrice.timestamp} <= ${new Date(endDate).toISOString()}`
        : undefined,
    ].filter(Boolean);

    const query = sql`
    SELECT 
      time_bucket(${sql.raw("'" + interval + "'")}, ${
      EtfPrice.timestamp
    }) AS "timestamp",
      first(${EtfPrice.open}, ${EtfPrice.timestamp}) AS open,
      max(${EtfPrice.high}) AS high,
      min(${EtfPrice.low}) AS low,
      last(${EtfPrice.close}, ${EtfPrice.timestamp}) AS close
    FROM ${EtfPrice}
    ${
      conditions.length > 0
        ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
        : sql``
    }
    GROUP BY 1
    ORDER BY "timestamp" ASC
  `;

    return (await DataSource.execute(query))?.rows ?? [];
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
        await DataSource.insert(EtfPrice).values(data);
        data.length = 0;
      }
    }
  }
}

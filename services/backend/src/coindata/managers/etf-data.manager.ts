import Decimal from "decimal.js";
import { eq, and, gte, desc, inArray, asc, lte, gt, lt } from "drizzle-orm";
import moment from "moment";
import { DataSource } from "../../db/DataSource";
import {
  Rebalance,
  EtfPrice,
  Funding,
  EtfFundingReward,
  Candles,
  MarketCap,
} from "../../db/schema";
import {
  AmountPerContracts,
  AssetWeights,
  PricesDto,
} from "../../interfaces/Rebalance.interface";
import { RebalanceConfig } from "../../interfaces/RebalanceConfig.interface";
import { CloseETFPrices } from "../dto/CloseETFPricesFutures.dto";

export class ETFDataManager {
  public static async generateETFPrice(
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
        await DataSource.select({
          timestamp: Candles.timestamp,
        })
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
      ? moment(lastETFPriceTimestamp?.timestamp).add(1, "minute")
      : moment(firstCandleDataStart).add(1, "minute");
    const endTime = moment(startTime).add(1, "minute");

    let price = +rebalanceData[0].price;

    const amountPerContractsTasks = [];

    while (endTime.isBefore(lastCandleDataLimit)) {
      const timestamp = startTime.toDate();
      amountPerContractsTasks.push(
        (async () => {
          const coinsWithPrices = await this.getCoinsPriceStartEndRecords(
            coinIds,
            startTime.valueOf(),
            endTime.valueOf()
          );

          if (coinsWithPrices.length > 0) {
            const assetsWithWeights = await this.setAssetWeights(
              coinsWithPrices
            );
            const amountPerContracts = this.setAmountPerContracts(
              assetsWithWeights,
              +rebalanceData[0].price
            );

            return { amountPerContracts, timestamp };
          }
          return { amountPerContracts: [], timestamp };
        })()
      );

      startTime.add(1, "minute");
      endTime.add(1, "minute");
    }

    const amountPerContractsData = await Promise.all(amountPerContractsTasks);

    for (const { amountPerContracts, timestamp } of amountPerContractsData) {
      const etfCandle = this.getCloseETFPrice(price, amountPerContracts);

      price = etfCandle?.close ? Number(etfCandle.close) : price;

      if (
        [etfCandle.open, etfCandle.close, etfCandle.high, etfCandle.low].every(
          (value) => value !== ""
        )
      ) {
        await DataSource.insert(EtfPrice).values({
          etfId: etfId as string,
          timestamp,
          open: etfCandle.open,
          high: etfCandle.high,
          low: etfCandle.low,
          close: etfCandle.close,
        });
      }
    }
  }

  public static async setYieldETFFundingReward(
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

  public static getCloseETFPrice(
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

  public static async getCoinsPriceStartEndRecords(
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

  public static async setAssetWeights(
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

  public static setAmountPerContracts(
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
}

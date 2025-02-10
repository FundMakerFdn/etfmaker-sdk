import Decimal from "decimal.js";
import { eq, and, gte, desc, inArray, asc, lte } from "drizzle-orm";
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

    const startTime = lastETFPriceTimestamp?.timestamp
      ? moment(lastETFPriceTimestamp?.timestamp).add(1, "minute")
      : moment(rebalanceData[0].timestamp);
    const endTime = moment(startTime).add(1, "minute");

    let prevReward = lastETFPriceTimestamp?.close
      ? +lastETFPriceTimestamp?.close
      : +rebalanceData[0].price;

    while (endTime.isBefore(lastCandleDataLimit)) {
      const coinsWithPrices = await this.getCoinsPriceStartEndRecords(
        coinIds,
        startTime.valueOf(),
        endTime.valueOf()
      );

      if (coinsWithPrices.length === 0) {
        throw new Error(
          `No coins with prices found for period ${moment(
            startTime
          ).toISOString()} - ${moment(endTime).toISOString()}`
        );
      }

      const assetsWithWeights = await this.setAssetWeights(coinsWithPrices);
      const amountPerContracts = this.setAmountPerContracts(
        assetsWithWeights,
        +rebalanceData[0].price
      );

      const etfCandle = this.getCloseETFPrice(prevReward, amountPerContracts);

      prevReward = +etfCandle.close;

      await DataSource.insert(EtfPrice).values({
        etfId: etfId as string,
        timestamp: startTime.toDate(),
        open: etfCandle.open.toString(),
        high: etfCandle.high.toString(),
        low: etfCandle.low.toString(),
        close: etfCandle.close.toString(),
      });
      startTime.add(1, "minute");
      endTime.add(1, "minute");
    }
  }

  public static async setYieldETFFundingReward(
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
    let pnlOpenSum = new Decimal(0);
    let pnlHighSum = new Decimal(0);
    let pnlLowSum = new Decimal(0);
    let pnlCloseSum = new Decimal(0);

    for (const asset of assetsAmountPerContracts) {
      const amount = new Decimal(asset.amountPerContracts);
      // Using each asset’s baseline from the start close
      const baseline = new Decimal(asset.startTime.close);
      const pnlOpen = new Decimal(asset.startTime.open)
        .sub(baseline)
        .mul(amount);
      const pnlHigh = new Decimal(asset.startTime.high)
        .sub(baseline)
        .mul(amount);
      const pnlLow = new Decimal(asset.startTime.low).sub(baseline).mul(amount);
      const pnlClose = new Decimal(asset.endTime.close)
        .sub(baseline)
        .mul(amount);

      pnlOpenSum = pnlOpenSum.add(pnlOpen);
      pnlHighSum = pnlHighSum.add(pnlHigh);
      pnlLowSum = pnlLowSum.add(pnlLow);
      pnlCloseSum = pnlCloseSum.add(pnlClose);
    }

    return {
      open: previousPrice.add(pnlOpenSum).toString(),
      high: previousPrice.add(pnlHighSum).toString(),
      low: previousPrice.add(pnlLowSum).toString(),
      close: previousPrice.add(pnlCloseSum).toString(),
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
            lte(Candles.timestamp, new Date(startTime))
          )
        )
        .orderBy(desc(Candles.timestamp))
        .limit(1);

      // Fetch the closest record to endtime
      let endRecord = await DataSource.select()
        .from(Candles)
        .where(
          and(
            eq(Candles.coinId, coinId),
            gte(Candles.timestamp, new Date(endTime))
          )
        )
        .orderBy(asc(Candles.timestamp))
        .limit(1);

      if (startRecord.length === 0) {
        startRecord = [
          {
            open: "0",
            high: "0",
            low: "0",
            close: "0",
            volume: "0",
            timestamp: new Date(startTime),
            coinId,
            id: null as any,
          },
        ];
      }
      if (endRecord.length === 0) {
        endRecord = [
          {
            open: "0",
            high: "0",
            low: "0",
            close: "0",
            volume: "0",
            timestamp: new Date(endTime),
            coinId,
            id: null as any,
          },
        ];
      }

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
    return assetsListWithWeights.map((asset) => ({
      ...asset,
      amountPerContracts: Decimal(etfPrice)
        .mul(new Decimal(asset.weight))
        .div(new Decimal(asset.startTime.close))
        .toNumber(),
    }));
  }
}

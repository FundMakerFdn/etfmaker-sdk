import Decimal from "decimal.js";
import { eq, desc, and, lte, gte, asc } from "drizzle-orm";
import moment from "moment";
import { DataSource } from "../../db/DataSource";
import { Coins, Rebalance, Candles } from "../../db/schema";
import { getRebalanceIntervalMs } from "../../helpers/GetRebalanceIntervalMs";
import {
  PricesDto,
  AssetWeights,
  AmountPerContracts,
} from "../../interfaces/Rebalance.interface";
import { RebalanceConfig } from "../../interfaces/RebalanceConfig.interface";
import { CloseETFPrices } from "../dto/CloseETFPricesFutures.dto";

export class RebalanceDataManager {
  public static async generateRebalanceData(
    config: RebalanceConfig
  ): Promise<void> {
    const amountOfCoins = Number(RegExp(/\d+/).exec(config.etfId)?.[0] ?? 0);

    const coins = await DataSource.select().from(Coins).limit(amountOfCoins);

    const rebalancePeriodMs = getRebalanceIntervalMs(config.etfId);

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
        coins.map((coin) => coin.id),
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

  private static async getCoinsPrices(
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

  private static setAssetWeights(assetsList: PricesDto[]): AssetWeights[] {
    const amount = assetsList.length;
    return assetsList.map((asset) => ({
      ...asset,
      weight: Decimal(1).div(amount).toNumber(),
    }));
  }

  private static setAmountPerContracts(
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
  private static getCloseETFPrice(
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

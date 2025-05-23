import { sql, eq, desc } from "drizzle-orm";
import { DataSource } from "../../db/DataSource";
import { Candles, EtfPrice } from "../../db/schema";
import { OhclGroupByEnum } from "../../enums/OhclGroupBy.enum";
import {
  GetOhclChartDataInput,
  OhclChartDataType,
} from "../dto/GetETFPrices.dto";
import { RebalanceConfig } from "../../interfaces/RebalanceConfig.interface";
import { RebalanceService } from "../../rebalance/rebalance.service";

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

export class IndexAggregateManager {
  private readonly rebalanceService: RebalanceService;

  constructor() {
    this.rebalanceService = new RebalanceService();
  }

  public async getEtfPriceDataGroupedRange({
    etfId,
    groupBy,
    from,
    to,
  }: GetOhclChartDataInput) {
    const interval = groupIntervalMapping[groupBy];

    const conditions = [
      sql`${EtfPrice.etfId} = ${etfId}`,
      from
        ? sql`${EtfPrice.timestamp} >= ${new Date(+from * 1000)}`
        : undefined,
      to ? sql`${EtfPrice.timestamp} <= ${new Date(+to * 1000)}` : undefined,
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
        LIMIT 1000
      `;

    return (await DataSource.execute(query))?.rows ?? [];
  }

  public async getEtfIndexLastOHCL(etfId: string): Promise<OhclChartDataType> {
    const data = await DataSource.select({
      open: EtfPrice.open,
      high: EtfPrice.high,
      low: EtfPrice.low,
      close: EtfPrice.close,
      time: EtfPrice.timestamp,
    })
      .from(EtfPrice)
      .where(eq(EtfPrice.etfId, etfId))
      .orderBy(desc(EtfPrice.timestamp))
      .limit(1)
      .execute();

    return {
      ...data?.[0],
      time: data?.[0]?.time?.getTime() / 1000,
    };
  }

  public async getCoinLastOHCL(coinId: number): Promise<OhclChartDataType> {
    const data = await DataSource.select({
      open: Candles.open,
      high: Candles.high,
      low: Candles.low,
      close: Candles.close,
      time: Candles.timestamp,
    })
      .from(Candles)
      .where(eq(Candles.coinId, coinId))
      .orderBy(desc(Candles.timestamp))
      .limit(1)
      .execute();

    return {
      ...data?.[0],
      time: data?.[0]?.time?.getTime() / 1000,
    };
  }

  public async getIndexAssetsCategoriesDistribution(
    etfId: RebalanceConfig["etfId"]
  ) {
    const indexRebalanceAssets = await this.rebalanceService.getRebalanceAssets(
      etfId
    );

    // Prepare a map to accumulate weight per main category
    const categoryWeightMap: Record<string, number> = {};

    for (const asset of indexRebalanceAssets) {
      const mainCategory =
        (asset.categories as string[])?.[0] ?? "Uncategorized";
      const weight = asset?.weight ? Number(asset.weight) : 0;

      if (!categoryWeightMap[mainCategory]) {
        categoryWeightMap[mainCategory] = 0;
      }

      categoryWeightMap[mainCategory] += weight;
    }

    const totalWeight = Object.values(categoryWeightMap).reduce(
      (sum, weight) => sum + weight,
      0
    );

    // Format result with percentage
    const distribution = Object.entries(categoryWeightMap).map(
      ([category, weight]) => ({
        category,
        weight,
        percentage: (weight / totalWeight) * 100,
      })
    );

    return distribution;
  }
}

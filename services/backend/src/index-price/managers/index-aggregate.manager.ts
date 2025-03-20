import { sql } from "drizzle-orm";
import { DataSource } from "../../db/DataSource";
import { EtfPrice } from "../../db/schema";
import { OhclGroupByEnum } from "../../enums/OhclGroupBy.enum";
import { GetOhclChartDataInput } from "../dto/GetETFPrices.dto";

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
  public async getEtfPriceDataGroupedRange({
    etfId,
    groupBy,
    from,
    to,
  }: GetOhclChartDataInput) {
    const startDate = new Date(from).getTime();
    const endDate = new Date(to).getTime();

    const interval = groupIntervalMapping[groupBy];

    const conditions = [
      sql`${EtfPrice.etfId} = ${etfId}`,
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
}

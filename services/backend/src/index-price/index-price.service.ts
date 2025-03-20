import { DataSource } from "../db/DataSource";
import { sql } from "drizzle-orm";
import { RebalanceConfig } from "../interfaces/RebalanceConfig.interface";
import { IndexGenerateManager } from "./managers/index-generate.manager";
import { IndexAggregateManager } from "./managers/index-aggregate.manager";
import {
  EtfPriceSetClientInput,
  GetOhclChartDataInput,
  OhclChartDataType,
} from "./dto/GetETFPrices.dto";

const indexAggregateManager = new IndexAggregateManager();

export class IndexPriceService {
  async getETFPrices({
    etfId,
    groupBy,
    from,
    to,
  }: GetOhclChartDataInput): Promise<OhclChartDataType[]> {
    let data;

    if (groupBy && from && to) {
      data = await indexAggregateManager.getEtfPriceDataGroupedRange({
        etfId,
        groupBy,
        from,
        to,
      });
    }

    if (!data || data.length === 0) {
      data = (
        await DataSource.execute(
          sql`
        SELECT * FROM (
          SELECT * FROM etf_price 
          ORDER BY timestamp DESC
          LIMIT 1000
        ) sub
        ORDER BY timestamp ASC
      `
        )
      ).rows;
    }

    if (!data) {
      return [];
    }

    return data.map((price) => ({
      time: new Date(price.timestamp as string).getTime() / 1000,
      open: price.open as string,
      high: price.high as string,
      low: price.low as string,
      close: price.close as string,
    }));
  }

  public async setIndexPriceSockerClient({
    socket,
    startTimestamp,
    etfId,
    groupBy,
  }: EtfPriceSetClientInput) {
    const getHistorical =
      await indexAggregateManager.getEtfPriceDataGroupedRange({
        etfId,
        groupBy,
        from: startTimestamp.toString(),
        to: new Date().getTime().toString(),
      });
  }

  generateETFPrice(etfId: RebalanceConfig["etfId"]): Promise<void> {
    const indexGenerateManager = new IndexGenerateManager(etfId);
    return indexGenerateManager.generateETFPrice(etfId);
  }

  setYieldETFFundingReward(etfId: RebalanceConfig["etfId"]): Promise<void> {
    const indexGenerateManager = new IndexGenerateManager(etfId);
    return indexGenerateManager.setYieldETFFundingReward(etfId);
  }
}

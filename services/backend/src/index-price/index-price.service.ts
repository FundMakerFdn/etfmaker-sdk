import { DataSource } from "../db/DataSource";
import { desc } from "drizzle-orm";
import { RebalanceConfig } from "../interfaces/RebalanceConfig.interface";
import { IndexGenerateManager } from "./managers/index-generate.manager";
import { IndexAggregateManager } from "./managers/index-aggregate.manager";
import {
  EtfPriceSetClientInput,
  GetOhclChartDataInput,
  OhclChartDataType,
} from "./dto/GetETFPrices.dto";
import { IndexWebsocketManager } from "./managers/index-websocket.manager";
import { EtfPrice } from "../db/schema";
import { OhclGroupByEnum } from "../enums/OhclGroupBy.enum";
import { RebalanceDataManager } from "../rebalance/managers/rebalance-data.manager";

const indexAggregateManager = new IndexAggregateManager();
const rebalanceDataManager = new RebalanceDataManager();

class IndexPriceService {
  private readonly streamManagers: Map<
    `${RebalanceConfig["etfId"]}${OhclGroupByEnum}`,
    IndexWebsocketManager
  > = new Map();

  private readonly streamingIndexes: Set<RebalanceConfig["etfId"]> = new Set();

  async getETFPrices({
    etfId,
    groupBy,
    from,
    to,
  }: GetOhclChartDataInput): Promise<OhclChartDataType[]> {
    const data = await indexAggregateManager.getEtfPriceDataGroupedRange({
      etfId,
      groupBy,
      from,
      to,
    });

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

  public async setIndexPriceSocketClient({
    socket,
    startTimestamp,
    etfId,
    groupBy,
  }: EtfPriceSetClientInput) {
    const historical = await indexAggregateManager.getEtfPriceDataGroupedRange({
      etfId,
      groupBy,
      from: startTimestamp.toString(),
      to: new Date().getTime().toString(),
    });

    if (historical.length > 0) {
      socket.send(
        JSON.stringify(
          historical.map((price) => ({
            time: new Date(price.timestamp as string).getTime() / 1000,
            open: price.open as string,
            high: price.high as string,
            low: price.low as string,
            close: price.close as string,
          }))
        )
      );
    }
    const lastEtfOHCL = await indexAggregateManager.getEtfIndexLastOHCL(etfId);

    let indexWebsocketManager = this.streamManagers.get(`${etfId}${groupBy}`);
    if (!indexWebsocketManager) {
      indexWebsocketManager = new IndexWebsocketManager(
        etfId,
        groupBy,
        lastEtfOHCL
      );
      this.streamManagers.set(`${etfId}${groupBy}`, indexWebsocketManager);
    }

    indexWebsocketManager.subscripeToIndexPrice(socket);
    await indexWebsocketManager.broadcastIndexPrice();
  }

  public async runIndexPricesStream() {
    const etfIds = await rebalanceDataManager.getAvailableRebalanceEtfIds();
    for (const etfId of etfIds) {
      if (this.streamManagers.has(`${etfId}${OhclGroupByEnum["1m"]}`)) continue;

      this.streamingIndexes.add(etfId);

      const lastEtfOHCL = await indexAggregateManager.getEtfIndexLastOHCL(
        etfId
      );

      const indexWebsocketManager = new IndexWebsocketManager(
        etfId,
        OhclGroupByEnum["1m"],
        lastEtfOHCL
      );
      await indexWebsocketManager.broadcastIndexPrice();
      this.streamManagers.set(
        `${etfId}${OhclGroupByEnum["1m"]}`,
        indexWebsocketManager
      );
    }
  }

  public generateETFPrice(etfId: RebalanceConfig["etfId"]): Promise<void> {
    const indexGenerateManager = new IndexGenerateManager(etfId);
    return indexGenerateManager.generateETFPrice(etfId);
  }

  public setYieldETFFundingReward(
    etfId: RebalanceConfig["etfId"]
  ): Promise<void> {
    const indexGenerateManager = new IndexGenerateManager(etfId);
    return indexGenerateManager.setYieldETFFundingReward(etfId);
  }

  public async getAvailableIndexEtfIds(): Promise<RebalanceConfig["etfId"][]> {
    return (
      await DataSource.selectDistinctOn([EtfPrice.etfId], {
        etfId: EtfPrice.etfId,
        timestamp: EtfPrice.timestamp,
      })
        .from(EtfPrice)
        .orderBy(desc(EtfPrice.etfId), desc(EtfPrice.timestamp))
        .execute()
    ).map((data) => data.etfId) as RebalanceConfig["etfId"][];
  }
}

export const indexPriceService = new IndexPriceService();

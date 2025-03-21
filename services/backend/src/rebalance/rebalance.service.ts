import { RebalanceDataManager } from "./managers/rebalance-data.manager";
import { DataSource } from "../db/DataSource";
import { Rebalance } from "../db/schema/rebalance";
import { ProcessingKeysEnum } from "../enums/Processing.enum";
import { RebalanceConfig } from "../interfaces/RebalanceConfig.interface";
import { ProcessingStatusService } from "../processing-status/processing-status.service";
import { CoinInterface } from "../interfaces/Coin.interface";
import { RebalanceCsvManager } from "./managers/rebalance-csv.manager";
import { isNotNull } from "drizzle-orm";

export class RebalanceService {
  private readonly rebalanceDataManager: RebalanceDataManager;

  constructor() {
    this.rebalanceDataManager = new RebalanceDataManager();
  }

  public getRebalanceAssets(
    etfId: RebalanceConfig["etfId"]
  ): Promise<CoinInterface[]> {
    return this.rebalanceDataManager.getAssets(etfId);
  }

  public async getRebalanceCategories(): Promise<string[]> {
    return (
      await DataSource.selectDistinctOn([Rebalance.coinCategory], {
        category: Rebalance.coinCategory,
      })
        .from(Rebalance)
        .where(isNotNull(Rebalance.coinCategory))
    )
      .map((category) => category.category)
      .filter((category) => category !== null);
  }

  public getRebalanceDataCsv(): Promise<string> {
    return RebalanceCsvManager.getRebalanceDataCsv();
  }

  public setRebalanceDataManualy() {
    return this.rebalanceDataManager.setRebalanceDataManualy(
      1738928704000,
      [{ coinId: 3, weight: 0.07 }],
      {
        etfId: "top20IndexHourly",
        startDate: new Date(1738928704000),
        initialPrice: 100,
      }
    );
  }

  public simulateRebalanceDataCSV(config: RebalanceConfig): Promise<string> {
    return RebalanceCsvManager.simulateRebalanceDataCSV(config);
  }

  public async generateRebalanceData(config: RebalanceConfig): Promise<void> {
    if (
      await ProcessingStatusService.isProcessing(ProcessingKeysEnum.processing)
    ) {
      return;
    }

    try {
      await ProcessingStatusService.setProcessing(
        ProcessingKeysEnum.processing
      );
      await this.rebalanceDataManager.generateRebalanceData(config);

      await ProcessingStatusService.setSuccess(ProcessingKeysEnum.processing);
    } catch (error) {
      await ProcessingStatusService.setError(ProcessingKeysEnum.processing);
      throw error;
    }
  }
}

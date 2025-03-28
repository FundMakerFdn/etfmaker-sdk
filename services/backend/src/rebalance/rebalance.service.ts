import { RebalanceDataManager } from "./managers/rebalance-data.manager";
import { DataSource } from "../db/DataSource";
import { Rebalance } from "../db/schema/rebalance";
import { ProcessingKeysEnum } from "../enums/Processing.enum";
import { RebalanceConfig } from "../interfaces/RebalanceConfig.interface";
import { ProcessingStatusService } from "../processing-status/processing-status.service";
import { RebalanceCsvManager } from "./managers/rebalance-csv.manager";
import { inArray, isNotNull, and, eq, gte } from "drizzle-orm";
import { AmountPerContracts } from "../interfaces/Rebalance.interface";
import { Coins } from "../db/schema";

export class RebalanceService {
  private readonly rebalanceDataManager: RebalanceDataManager;
  private readonly rebalanceCsvManager: RebalanceCsvManager;

  constructor() {
    this.rebalanceDataManager = new RebalanceDataManager();
    this.rebalanceCsvManager = new RebalanceCsvManager();
  }

  public getRebalanceAssets(etfId: RebalanceConfig["etfId"]) {
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
    return this.rebalanceCsvManager.getRebalanceDataCsv();
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
    return this.rebalanceCsvManager.simulateRebalanceDataCSV(config);
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

  public async getRebalanceAssetsListByDate(
    date: Date,
    etfId: RebalanceConfig["etfId"]
  ): Promise<Array<AmountPerContracts & { symbol: string }>> {
    const assets = (
      await DataSource.select({ assets: Rebalance.data })
        .from(Rebalance)
        .where(and(eq(Rebalance.etfId, etfId), gte(Rebalance.timestamp, date)))
        .limit(1)
    )?.[0].assets as Array<AmountPerContracts>;

    if (!assets) return [];

    const symbols = await DataSource.select({
      symbol: Coins.symbol,
      coinId: Coins.id,
    })
      .from(Coins)
      .where(
        inArray(
          Coins.id,
          assets.map((asset) => asset.coinId)
        )
      );

    if (symbols.length === 0) return [];

    return assets.map((asset) => {
      const symbolData = symbols.find((s) => s.coinId === asset.coinId);
      return { ...asset, symbol: symbolData?.symbol ?? "" };
    });
  }
}

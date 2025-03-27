import { desc, eq } from "drizzle-orm";
import { DataSource } from "../db/DataSource";
import { ProcessingStatus } from "../db/schema/processingStatus";
import {
  ProcessingKeysEnum,
  ProcessingStatusEnum,
} from "../enums/Processing.enum";
import { RebalanceConfig } from "../interfaces/RebalanceConfig.interface";
import { IndexStatusEnum } from "../enums/IndexStatus.enum";
import { IndexProcessingStatus } from "../db/schema/indexProcessingStatus";

export class ProcessingStatusService {
  private static async getProcessingStatus(
    key: ProcessingKeysEnum | string
  ): Promise<string | undefined> {
    const data = await DataSource.select({ status: ProcessingStatus.status })
      .from(ProcessingStatus)
      .where(eq(ProcessingStatus.key, key))
      .orderBy(desc(ProcessingStatus.timestamp))
      .limit(1);

    return data?.[0]?.status;
  }

  public static async isProcessing(
    key: ProcessingKeysEnum | string
  ): Promise<boolean> {
    const status = await this.getProcessingStatus(key);
    return status === ProcessingKeysEnum.processing;
  }

  public static async setProcessing(
    key: ProcessingKeysEnum | string
  ): Promise<void> {
    await DataSource.insert(ProcessingStatus)
      .values([{ key, status: ProcessingStatusEnum.processing }])
      .execute();
  }

  public static async setSuccess(
    key: ProcessingKeysEnum | string
  ): Promise<void> {
    await DataSource.insert(ProcessingStatus)
      .values([{ key, status: ProcessingStatusEnum.success }])
      .execute();
  }

  public static async setError(
    key: ProcessingKeysEnum | string
  ): Promise<void> {
    await DataSource.insert(ProcessingStatus)
      .values([{ key, status: ProcessingStatusEnum.error }])
      .execute();
  }

  public static async failAll(): Promise<void> {
    await DataSource.update(ProcessingStatus)
      .set({ status: ProcessingStatusEnum.error })
      .where(eq(ProcessingStatus.status, ProcessingStatusEnum.processing));
  }

  public static async getIndexProcessingStatus(
    etfId: RebalanceConfig["etfId"]
  ) {
    return (
      await DataSource.select({ status: IndexProcessingStatus.status })
        .from(IndexProcessingStatus)
        .where(eq(IndexProcessingStatus.etfId, etfId))
        .orderBy(desc(IndexProcessingStatus.timestamp))
        .limit(1)
    )?.[0]?.status;
  }

  public static async isRebalanceIndexProcessing(
    etfId: RebalanceConfig["etfId"]
  ): Promise<boolean> {
    const status = await this.getIndexProcessingStatus(etfId);
    return status === IndexStatusEnum.PROCESSING_REBALANCE;
  }

  public static async isEtfPriceIndexProcessing(
    etfId: RebalanceConfig["etfId"]
  ): Promise<boolean> {
    const status = await this.getIndexProcessingStatus(etfId);
    return status === IndexStatusEnum.PROCESSING_ETF_PRICE;
  }

  public static async isEtfFundingRewardIndexProcessing(
    etfId: RebalanceConfig["etfId"]
  ): Promise<boolean> {
    const status = await this.getIndexProcessingStatus(etfId);
    return status === IndexStatusEnum.PROCESSING_ETF_FUNDING_REWARD;
  }

  public static async isRebalanceIndexSuccess(
    etfId: RebalanceConfig["etfId"]
  ): Promise<boolean> {
    const status = await this.getIndexProcessingStatus(etfId);
    return status === IndexStatusEnum.SUCCESS_REBALANCE;
  }

  public static async isEtfPriceIndexSuccess(
    etfId: RebalanceConfig["etfId"]
  ): Promise<boolean> {
    const status = await this.getIndexProcessingStatus(etfId);
    return status === IndexStatusEnum.SUCCESS_ETF_PRICE;
  }

  public static async isEtfFundingRewardIndexSuccess(
    etfId: RebalanceConfig["etfId"]
  ): Promise<boolean> {
    const status = await this.getIndexProcessingStatus(etfId);
    return status === IndexStatusEnum.SUCCESS_ETF_FUNDING_REWARD;
  }

  public static async setIndexProcessingStatus(
    etfId: RebalanceConfig["etfId"],
    status: IndexStatusEnum
  ): Promise<void> {
    await DataSource.insert(IndexProcessingStatus)
      .values([
        {
          etfId,
          status,
        },
      ])
      .execute();
  }

  public static async setRebalanceIndexProcessing(
    etfId: RebalanceConfig["etfId"]
  ): Promise<void> {
    await this.setIndexProcessingStatus(
      etfId,
      IndexStatusEnum.PROCESSING_REBALANCE
    );
  }

  public static async setEtfPriceIndexProcessing(
    etfId: RebalanceConfig["etfId"]
  ): Promise<void> {
    await this.setIndexProcessingStatus(
      etfId,
      IndexStatusEnum.PROCESSING_ETF_PRICE
    );
  }

  public static async setEtfFundingRewardIndexProcessing(
    etfId: RebalanceConfig["etfId"]
  ): Promise<void> {
    await this.setIndexProcessingStatus(
      etfId,
      IndexStatusEnum.PROCESSING_ETF_FUNDING_REWARD
    );
  }

  public static async setIndexNoRebalanceDataError(
    etfId: RebalanceConfig["etfId"]
  ): Promise<void> {
    await this.setIndexProcessingStatus(
      etfId,
      IndexStatusEnum.ERROR_NO_REBALANCE_DATA
    );
  }

  public static async setIndexRebalanceProcessingSuccess(
    etfId: RebalanceConfig["etfId"]
  ): Promise<void> {
    await this.setIndexProcessingStatus(
      etfId,
      IndexStatusEnum.SUCCESS_REBALANCE
    );
  }

  public static async setIndexEtfPriceSuccess(
    etfId: RebalanceConfig["etfId"]
  ): Promise<void> {
    await this.setIndexProcessingStatus(
      etfId,
      IndexStatusEnum.SUCCESS_ETF_PRICE
    );
  }

  public static async setIndexEtfFundingRewardSuccess(
    etfId: RebalanceConfig["etfId"]
  ): Promise<void> {
    await this.setIndexProcessingStatus(
      etfId,
      IndexStatusEnum.SUCCESS_ETF_FUNDING_REWARD
    );
  }

  public static async failAllIndexProcessingStatuses() {
    const allEtfIds = await DataSource.selectDistinct({
      etfId: IndexProcessingStatus.etfId,
    })
      .from(IndexProcessingStatus)
      .execute();

    if (!allEtfIds || allEtfIds.length === 0) {
      console.error("No data found in IndexProcessingStatus table.");
      return;
    }

    const statusUpdates = allEtfIds
      .map((d) => {
        const etfId = d?.etfId;

        return etfId
          ? {
              etfId,
              status: IndexStatusEnum.ERROR_UNKNOWN,
            }
          : null;
      })
      .filter((d) => d !== null);

    if (statusUpdates.length === 0) return;

    await DataSource.insert(IndexProcessingStatus)
      .values(statusUpdates)
      .execute();
  }
}

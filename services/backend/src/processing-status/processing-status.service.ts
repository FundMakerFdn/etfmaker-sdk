import { desc, eq } from "drizzle-orm";
import { DataSource } from "../db/DataSource";
import { ProcessingStatus } from "../db/schema";
import {
  ProcessingKeysEnum,
  ProcessingStatusEnum,
} from "../enums/Processing.enum";

export class ProcessingStatusService {
  private static async getProcessingStatus(
    key: ProcessingKeysEnum
  ): Promise<string | undefined> {
    const data = await DataSource.select({ status: ProcessingStatus.status })
      .from(ProcessingStatus)
      .where(eq(ProcessingStatus.key, key))
      .orderBy(desc(ProcessingStatus.timestamp))
      .limit(1);

    return data?.[0]?.status;
  }

  public static async isProcessing(key: ProcessingKeysEnum): Promise<boolean> {
    const status = await this.getProcessingStatus(key);
    return status === ProcessingKeysEnum.processing;
  }

  public static async setProcessing(key: ProcessingKeysEnum): Promise<void> {
    await DataSource.insert(ProcessingStatus)
      .values([{ key, status: ProcessingStatusEnum.processing }])
      .execute();
  }

  public static async setSuccess(key: ProcessingKeysEnum): Promise<void> {
    await DataSource.insert(ProcessingStatus)
      .values([{ key, status: ProcessingStatusEnum.success }])
      .execute();
  }

  public static async setError(key: ProcessingKeysEnum): Promise<void> {
    await DataSource.insert(ProcessingStatus)
      .values([{ key, status: ProcessingStatusEnum.error }])
      .execute();
  }

  public static async failAll(): Promise<void> {
    await DataSource.update(ProcessingStatus)
      .set({ status: ProcessingStatusEnum.error })
      .where(eq(ProcessingStatus.status, ProcessingStatusEnum.processing));
  }
}

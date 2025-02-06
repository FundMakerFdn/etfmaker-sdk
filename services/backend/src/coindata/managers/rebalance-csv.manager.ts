import { stringify } from "csv-stringify";
import { DataSource } from "../../db/DataSource";
import { Coins, Rebalance } from "../../db/schema";
import { RebalanceDto } from "../../interfaces/Rebalance.interface";
import { desc, eq } from "drizzle-orm";
import { RebalanceDataManager } from "./rebalance-data.manager";
import { RebalanceConfig } from "../../interfaces/RebalanceConfig.interface";

interface CsvDataRaw {
  id: number;
  etfId: string;
  timestamp: Date;
  coinId: number;
  "name of asset": string;
  weight: number;
  "amount per contracts": number;
}

export class RebalanceCsvManager {
  public static async getRebalanceDataCsv(): Promise<string> {
    const rebalanceData = await DataSource.select()
      .from(Rebalance)
      .orderBy(desc(Rebalance.timestamp));

    if (rebalanceData.length === 0) return "";

    return this.generateCsvFromRebalanceData(rebalanceData as RebalanceDto[]);
  }

  public static async simulateRebalanceDataCSV(
    config: RebalanceConfig
  ): Promise<string> {
    const rebalanceData = await RebalanceDataManager.generateRebalanceData(
      config
    );

    return this.generateCsvFromRebalanceData(rebalanceData);
  }

  private static async generateCsvFromRebalanceData(
    rebalanceData: Omit<RebalanceDto, "id">[]
  ): Promise<string> {
    const header = [
      "id",
      "etfId",
      "timestamp",
      "coinId",
      "name of asset",
      "weight",
      "amount per contracts",
    ];

    const dataSet = [] as CsvDataRaw[];

    for (const data of rebalanceData) {
      const transformedData = await this.transformDataset(data);
      dataSet.push(...transformedData);
    }

    return new Promise((resolve, reject) => {
      stringify(
        dataSet,
        { header: true, columns: header },
        (err: any, output: string | PromiseLike<string>) => {
          if (err) {
            return reject(err);
          }
          resolve(output);
        }
      );
    });
  }

  private static async transformDataset(
    data: Omit<RebalanceDto, "id">
  ): Promise<CsvDataRaw[]> {
    const transformedData = [] as CsvDataRaw[];
    let id = 1;

    for (const asset of data.data) {
      const coinName = await DataSource.select({ name: Coins.name })
        .from(Coins)
        .where(eq(Coins.id, asset.coinId))
        .limit(1);

      transformedData.push({
        id: id++,
        etfId: data.etfId,
        timestamp: data.timestamp,
        coinId: asset.coinId,
        "name of asset": coinName[0].name,
        weight: asset.weight,
        "amount per contracts": asset.amountPerContracts,
      });
    }

    return transformedData;
  }
}

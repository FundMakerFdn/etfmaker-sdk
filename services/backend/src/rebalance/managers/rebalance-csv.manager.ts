import { stringify } from "csv-stringify";
import { DataSource } from "../../db/DataSource";
import { RebalanceDto } from "../../interfaces/Rebalance.interface";
import { desc, inArray } from "drizzle-orm";
import { RebalanceDataManager } from "./rebalance-data.manager";
import { RebalanceConfig } from "../../interfaces/RebalanceConfig.interface";
import { Rebalance, Coins } from "../../db/schema";

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
  private readonly rebalanceDataManager: RebalanceDataManager;

  constructor() {
    this.rebalanceDataManager = new RebalanceDataManager();
  }

  public async getRebalanceDataCsv(): Promise<string> {
    const rebalanceData = await DataSource.select()
      .from(Rebalance)
      .orderBy(desc(Rebalance.timestamp));

    if (rebalanceData.length === 0) return "";

    return this.generateCsvFromRebalanceData(rebalanceData as RebalanceDto[]);
  }

  public async simulateRebalanceDataCSV(
    config: RebalanceConfig
  ): Promise<string> {
    const simulatedRebalanceData =
      await this.rebalanceDataManager.generateRebalanceData(config, true);

    return this.generateCsvFromRebalanceData(simulatedRebalanceData!);
  }

  private async generateCsvFromRebalanceData(
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

    const coinIds = rebalanceData
      .map((data) => data.data.map((d) => d.coinId))
      .flat();
    const coins = await DataSource.select({
      id: Coins.id,
      name: Coins.name,
    })
      .from(Coins)
      .where(inArray(Coins.id, coinIds));

    for (const data of rebalanceData) {
      const transformedData = this.transformDataset(data, coins);
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

  private transformDataset(
    data: Omit<RebalanceDto, "id">,
    coins: Record<string, any>[]
  ): CsvDataRaw[] {
    const transformedData = [] as CsvDataRaw[];
    let id = 1;

    for (const asset of data.data) {
      const coinData = coins.find((c) => c.id === asset.coinId);
      const coinName = coinData?.name;

      transformedData.push({
        id: id++,
        etfId: data.etfId,
        timestamp: data.timestamp,
        coinId: asset.coinId,
        "name of asset": coinName,
        weight: asset.weight,
        "amount per contracts": asset.amountPerContracts,
      });
    }

    return transformedData;
  }
}

import { desc, eq, inArray } from "drizzle-orm";
import { DataSource } from "../db/DataSource";
import { Coins, Rebalance } from "../db/schema";
import { CoinInterface } from "../interfaces/Coin.interface";
import {
  AmountPerContracts,
  RebalanceDto,
} from "../interfaces/Rebalance.interface";
import { RebalanceConfig } from "../interfaces/RebalanceConfig.interface";

export class RebalanceDataManager {
  public static async getRebalanceAssets(): Promise<CoinInterface[]> {
    const assets = await DataSource.select()
      .from(Rebalance)
      .orderBy(desc(Rebalance.timestamp))
      .limit(1)
      .then((data) => {
        if (data.length === 0) return [];
        return data[0].data as AmountPerContracts[];
      });

    return DataSource.select()
      .from(Coins)
      .where(
        inArray(
          Coins.id,
          assets.map((asset) => asset.coinId)
        )
      ) as Promise<CoinInterface[]>;
  }

  public static async getLatestRebalanceData(
    etfId: RebalanceConfig["etfId"]
  ): Promise<RebalanceDto> {
    return (
      await DataSource.select()
        .from(Rebalance)
        .where(eq(Rebalance.etfId, etfId))
        .orderBy(desc(Rebalance.timestamp))
        .limit(1)
    )?.[0] as RebalanceDto;
  }

  public static async getAssetRebalanceWeight(coinId: number): Promise<number> {
    const rebalanceData = (
      await DataSource.select()
        .from(Rebalance)
        .orderBy(desc(Rebalance.timestamp))
        .limit(1)
    )?.[0] as RebalanceDto;

    if (!rebalanceData) {
      console.log("No rebalance data found");
      return 0;
    }

    const asset = rebalanceData.data.find((asset) => asset.coinId === coinId);

    if (!asset) {
      console.log(`No asset found for coinId ${coinId}`);
      return 0;
    }

    return asset.weight;
  }
}

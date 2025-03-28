import { CoinGeckoService } from "../../coingecko/coingecko.service";
import { RebalanceConfig } from "../../interfaces/RebalanceConfig.interface";
import { RebalanceService } from "../../rebalance/rebalance.service";
import { stringify } from "csv-stringify";

export class IndexCsvManager {
  private readonly rebalanceService: RebalanceService;
  private readonly coingeckoService: CoinGeckoService;

  constructor() {
    this.rebalanceService = new RebalanceService();
    this.coingeckoService = new CoinGeckoService();
  }

  public async generateIndexAssetsCsv(
    etfId: RebalanceConfig["etfId"]
  ): Promise<string> {
    const etfAssets = await this.rebalanceService.getRebalanceAssets(etfId);

    const etfAssetsWithCategories = etfAssets.map((asset) => {
      const categories = (asset?.categories as string[]) ?? [];
      let mainCategory;

      if (
        categories.some((c: string) => c.toLowerCase().includes("stablecoin"))
      ) {
        mainCategory = "Stablecoins";
      } else if (
        categories.some((c: string) => c.toLowerCase().includes("layer 1"))
      ) {
        mainCategory = "L1";
      } else {
        mainCategory = "Uncategorized";
      }

      return {
        ...asset,
        categories,
        mainCategory,
      };
    });

    return this.aggregateCsvData(etfAssetsWithCategories);
  }

  private aggregateCsvData(data: any[]): Promise<string> {
    const header = {
      id: "id",
      etfId: "etfId",
      assetId: "name of asset",
      weight: "weight",
      amount: "amount per contracts",
      categories: "categories",
      mainCategory: "mainCategory",
    };
    const dataSet = data.map((d, id) => ({
      id: id + 1,
      etfId: d.etfId,
      assetId: d.assetId,
      weight: d.weight,
      amount: d.amount,
      categories: d.categories.join(", "),
      mainCategory: d.mainCategory,
    }));

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
}

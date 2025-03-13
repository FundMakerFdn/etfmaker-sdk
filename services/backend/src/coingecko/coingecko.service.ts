import axios from "axios";
import moment from "moment";
import { GetMarketCapLimiter } from "./limiters";
import { RebalanceConfig } from "../interfaces/RebalanceConfig.interface";
import { CoinCategory } from "../interfaces/CoinCategory.interface";
import { DataSource } from "../db/DataSource";
import { MarketCap } from "../db/schema/schema";
import categoryWhiteList from "../config/category-whitelist.json";

export class CoinGeckoService {
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor() {
    this.apiKey = process.env.COIN_GECKO_API_KEY ?? "";
    this.apiUrl =
      process.env.COIN_GECKO_API_URL ?? "https://pro-api.coingecko.com/api/v3";
  }

  async ping() {
    axios.get(`${this.apiUrl}/ping`).then((response) => {
      console.log(response.data);
    });
  }

  getCoinList(
    category?: RebalanceConfig["category"]
  ): Promise<Record<string, any>[]> {
    const fetchQueue = [];

    const headers = {
      accept: "application/json",
      "x-cg-pro-api-key": this.apiKey,
    };

    const params = {
      vs_currency: "usd",
      order: "market_cap_desc",
      per_page: "250",
    } as { category?: string };

    if (category) {
      params["category"] = category;
    }

    for (let page = 1; page <= 40; page++) {
      // 40 pages * 250 coins = 10000 coins
      fetchQueue.push(
        axios.get(`${this.apiUrl}/coins/markets`, {
          headers,
          params: {
            ...params,
            page: page.toString(),
          },
        })
      );
    }

    return axios.all(fetchQueue).then(
      axios.spread((...responses) =>
        responses.reduce(
          (acc, response) =>
            acc.concat(
              response.data.map((coin: any) => ({
                ...coin,
                symbol: coin.symbol.toUpperCase(),
              }))
            ),
          []
        )
      )
    );
  }

  async setCoinMarketCap(
    assetId: string,
    coinId: number,
    days: number
  ): Promise<void> {
    const endTime = moment().valueOf();
    let startTime = moment().subtract(days, "days").valueOf();
    const day = 1000 * 60 * 60 * 24;

    while (startTime < endTime - day) {
      const response = await GetMarketCapLimiter.schedule(() =>
        axios.get(
          `${this.apiUrl}/coins/${assetId}/market_chart?vs_currency=usd&days=${days}&interval=daily`,
          {
            headers: {
              accept: "application/json",
              "x-cg-pro-api-key": this.apiKey,
            },
          }
        )
      );

      if (response.data.market_caps.length === 0) {
        break;
      }

      const marketCapData = response.data.market_caps.map(
        ([timestamp, marketCap]: [number, number]) => ({
          coinId,
          timestamp: new Date(timestamp),
          marketCap: marketCap.toString(),
        })
      );

      await DataSource.insert(MarketCap).values(marketCapData);

      startTime = marketCapData[marketCapData.length - 1].timestamp + 1;
    }
  }

  getCoinCategories(): CoinCategory[] {
    return categoryWhiteList as CoinCategory[];
  }
}

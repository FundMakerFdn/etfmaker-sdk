import axios from "axios";
import { DataSource } from "../db/DataSource";
import { CoinGeckoTopTable } from "../db/tables";

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

  getCoinList() {
    return axios
      .get(
        `${this.apiUrl}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1`,
        {
          headers: {
            accept: "application/json",
            "x-cg-pro-api-key": this.apiKey,
          },
        }
      )
      .then((response) => {
        return response.data;
      });
  }

  async updateCoinGeckoDbList() {
    const coinList = await this.getCoinList();
    const coinListData = coinList.map((coin: any) => {
      return {
        name: coin.name,
        symbol: coin.symbol,
        assetId: coin.id,
      };
    });

    return DataSource.insert(CoinGeckoTopTable).values(coinListData);
  }
}

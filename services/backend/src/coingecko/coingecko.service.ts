import axios from "axios";
import moment from "moment";
import { GetMarketCapLimiter } from "./limiters";

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

  getCoinList(): Promise<Record<string, any>[]> {
    const fetchQueue = [];
    for (let page = 1; page <= 40; page++) {
      // 40 pages * 250 coins = 10000 coins
      fetchQueue.push(
        axios.get(
          `${this.apiUrl}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}`,
          {
            headers: {
              accept: "application/json",
              "x-cg-pro-api-key": this.apiKey,
            },
          }
        )
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

  async getCoinMarketCap(
    coinId: string
  ): Promise<{ timestamp: number; marketCap: number }[]> {
    const from = moment().subtract(60, "months").unix();
    const to = moment().unix();

    const response = await GetMarketCapLimiter.schedule(() =>
      axios.get(
        `${this.apiUrl}/coins/${coinId}/market_chart?vs_currency=usd&from=${from}&to=${to}&interval=5m`,
        {
          headers: {
            accept: "application/json",
            "x-cg-pro-api-key": this.apiKey,
          },
        }
      )
    );

    return response.data.market_caps.map(
      ([timestamp, marketCap]: [number, number]) => ({
        timestamp,
        marketCap,
      })
    );
  }
}

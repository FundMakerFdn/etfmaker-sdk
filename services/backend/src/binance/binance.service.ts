import axios from "axios";
import moment from "moment";
import { OpenInterestBinanceDataInterface } from "../interfaces/OpenInteresType";
import { CandlesType } from "../interfaces/CandlesType";
import { sleep } from "../helpers/sleep";

export class BinanceService {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly fapiUrl: string;
  private readonly secretKey: string;
  private readonly binanceUrl: string;

  constructor() {
    this.apiUrl =
      process.env.BINANCE_API_URL ?? "https://api.binance.com/api/v3";
    this.fapiUrl =
      process.env.BINANCE_FAPI_URL ?? "https://fapi.binance.com/fapi/v1";
    this.apiKey = process.env.BINANCE_API_KEY ?? "";
    this.secretKey = process.env.BINANCE_SECRET_KEY ?? "";
    this.binanceUrl = process.env.BINANCE_URL ?? "https://binance.com";
  }

  async getFuturesSymbols(): Promise<Record<string, any>[]> {
    const response = await axios.get(this.fapiUrl + "/exchangeInfo");

    return response.data.symbols;
  }

  async getHistoricalCandles(
    symbol: string,
    startTime: number,
    endTime: number,
    interval: string = "1m"
  ): Promise<CandlesType[]> {
    const url =
      (symbol.includes("USDT") ? this.fapiUrl : this.apiUrl) + "/klines";

    const params = {
      symbol,
      interval,
      startTime,
      endTime,
      limit: 1000, // Max candles per request
    };

    try {
      const response = await axios.get(url, { params });
      return response.data.map((candle: string[]) => ({
        timestamp: candle[0], // Open time
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5]),
      }));
    } catch (error: any) {
      console.error(`Error fetching candles for ${symbol}:`, error.message);
      throw error;
    }
  }

  async getAllHistoricalCandles(
    symbol: string,
    interval: string = "1m"
  ): Promise<CandlesType[]> {
    const endTime = Date.now();
    const startTime = moment().subtract(60, "months").valueOf(); //60 months ago

    let allCandles: CandlesType[] = [];
    let currentStartTime = startTime;

    while (currentStartTime < endTime) {
      const candles = await this.getHistoricalCandles(
        symbol,
        currentStartTime,
        endTime,
        interval
      );
      if (candles.length === 0) break; // No more data

      allCandles = allCandles.concat(candles);
      currentStartTime = candles[candles.length - 1].timestamp + 1; // Next chunk
    }

    return allCandles;
  }

  private async getFundingRates(
    symbol: string,
    startTime: number,
    endTime: number
  ) {
    const url = `${this.fapiUrl}/fundingRate`;
    const params = { symbol, startTime, endTime, limit: 1000 };

    try {
      const response = await axios.get(url, { params });
      return response.data.map((rate: Record<string, any>) => {
        return {
          symbol: rate.symbol,
          timestamp: rate.fundingTime,
          fundingRate: parseFloat(rate.fundingRate),
        };
      });
    } catch (error: any) {
      console.error(
        `Error fetching funding rates for ${symbol}:`,
        error.message
      );
      throw error;
    }
  }

  async getAllFundingRates(symbol: string) {
    //exists only for futures
    const endTime = Date.now();
    const startTime = moment().subtract(60, "months").valueOf(); //60 months ago

    let allRates: number[][] = [];
    let currentStartTime = startTime;

    while (currentStartTime < endTime) {
      const rates = await this.getFundingRates(
        symbol,
        currentStartTime,
        endTime
      );
      if (rates.length === 0) break; // No more data

      allRates = allRates.concat(rates);
      currentStartTime = rates[rates.length - 1].timestamp + 1; // Next chunk
    }

    return allRates;
  }

  private async getOpenInterest(
    symbol: string,
    startTime: number,
    endTime: number,
    period: string = "5m"
  ): Promise<OpenInterestBinanceDataInterface[]> {
    const params = {
      symbol,
      limit: 500,
      startTime,
      endTime,
      period,
      headers: {
        "X-MBX-APIKEY": this.apiKey,
      },
    };
    const url = `${this.binanceUrl}/futures/data/openInterestHist`;

    try {
      const response = await axios.get(url, { params });
      return response.data.map((oi: Record<string, any>) => ({
        timestamp: oi.timestamp,
        sumOpenInterest: oi.sumOpenInterest,
        sumOpenInterestValue: oi.sumOpenInterestValue,
      }));
    } catch (error: any) {
      console.error(
        `Error fetching open interest for ${symbol}:`,
        error.message
      );
      throw error;
    }
  }

  async getAllOpenInterest(
    symbol: string
  ): Promise<OpenInterestBinanceDataInterface[]> {
    //exists only for futures
    const endTime = Date.now();
    const startTime = moment().subtract(30, "days").valueOf(); //30 days ago

    let allOpenInterest: OpenInterestBinanceDataInterface[] = [];
    let currentStartTime = startTime;

    let requests = 0;

    while (currentStartTime < endTime) {
      const openInterest = await this.getOpenInterest(
        symbol,
        currentStartTime,
        endTime
      );
      if (openInterest.length === 0) break; // No more data
      requests++;

      console.log("Requests:", requests);

      if (requests > 1000)
        await sleep(1000 * 60 * 5).then(() => (requests = 0)); // Binance rate limit, 5 minutes

      allOpenInterest = allOpenInterest.concat(openInterest);
      currentStartTime = openInterest[openInterest.length - 1].timestamp + 1;
    }

    return allOpenInterest;
  }
}

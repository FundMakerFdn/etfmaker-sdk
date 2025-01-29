import axios from "axios";
import moment from "moment";
import { OpenInterestBinanceDataInterface } from "../interfaces/OpenInteresType";
import { CandlesType } from "../interfaces/CandlesType";
import { CoinSourceEnum } from "../enums/CoinData.enum";
import { BinanceCoinsDataDto } from "./dto/BinanceCoinsData.dto";
import {
  CoinMFuturesSymbolsLimiter,
  FundingRateLimiter,
  HistoricalCandlesLimiter,
  OpenInterestLimiter,
  SpotsSymbolsLimiter,
  UsdMFuturesSymbolsLimiter,
} from "./limiters";

export class BinanceService {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly fapiUrl: string;
  private readonly dapiUrl: string;
  private readonly secretKey: string;
  private readonly binanceUrl: string;

  constructor() {
    this.apiUrl =
      process.env.BINANCE_API_URL ?? "https://api.binance.com/api/v3";
    this.fapiUrl =
      process.env.BINANCE_FAPI_URL ?? "https://fapi.binance.com/fapi/v1";
    this.dapiUrl =
      process.env.BINANCE_DAPI_URL ?? "https://dapi.binance.com/dapi/v1";
    this.apiKey = process.env.BINANCE_API_KEY ?? "";
    this.secretKey = process.env.BINANCE_SECRET_KEY ?? "";
    this.binanceUrl = process.env.BINANCE_URL ?? "https://binance.com";
  }

  async getBinanceCoinsData(): Promise<BinanceCoinsDataDto> {
    const data = {
      usdMFutures: new Map<string, { symbol: string; pair: string }>(),
      coinMFutures: new Map<string, { symbol: string; pair: string }>(),
      spots: new Map<string, { symbol: string }>(),
    } as BinanceCoinsDataDto;

    const coinMFutures = await this.getCoinMFuturesSymbols();
    coinMFutures.forEach((symbol) =>
      data.coinMFutures.set(symbol.baseAsset, {
        pair: symbol.pair,
        symbol: symbol.symbol,
      })
    );

    const usdMFutures = await this.getUsdMFuturesSymbols();
    usdMFutures.forEach((symbol) =>
      data.usdMFutures.set(symbol.baseAsset, {
        pair: symbol.pair,
        symbol: symbol.symbol,
      })
    );

    const spots = await this.getSpotsSymbols();
    spots.forEach((symbol: Record<string, string>) =>
      data.spots.set(symbol.baseAsset, { symbol: symbol.symbol })
    );

    return data;
  }

  private async getUsdMFuturesSymbols(): Promise<Record<string, any>[]> {
    const usdMFutures = await UsdMFuturesSymbolsLimiter.schedule(() =>
      axios.get(this.fapiUrl + "/exchangeInfo")
    );

    return usdMFutures.data.symbols;
  }

  private async getCoinMFuturesSymbols(): Promise<Record<string, any>[]> {
    const coinMFutures = await CoinMFuturesSymbolsLimiter.schedule(() =>
      axios.get(this.dapiUrl + "/exchangeInfo")
    );

    return coinMFutures.data.symbols;
  }

  private async getSpotsSymbols(): Promise<Record<string, any>[]> {
    const spots = await SpotsSymbolsLimiter.schedule(() =>
      axios.get(this.apiUrl + "/exchangeInfo")
    );

    return spots.data.symbols;
  }

  async getHistoricalCandles(
    source: CoinSourceEnum,
    symbol: string,
    coinId: number,
    startTime: number,
    endTime: number,
    interval: string = "1m"
  ): Promise<CandlesType[]> {
    let url = `${this.apiUrl}/klines`;

    if (source === CoinSourceEnum.USDMFUTURES) {
      url = `${this.fapiUrl}/klines`;
    } else if (source === CoinSourceEnum.COINMFUTURES) {
      url = `${this.dapiUrl}/klines`;
    }

    const params = {
      symbol,
      interval,
      startTime,
      endTime,
      limit: 1500, // Max candles per request
    };

    try {
      const response = await HistoricalCandlesLimiter.schedule(() =>
        axios.get(url, { params })
      );

      return response.data.map((candle: string[]) => ({
        coinId,
        timestamp: new Date(candle[0]), // Open time
        open: candle[1].toString(),
        high: candle[2].toString(),
        low: candle[3].toString(),
        close: candle[4].toString(),
        volume: candle[5].toString(),
      }));
    } catch (error: any) {
      console.error(`Error fetching candles for ${symbol}:`, error.message);
      throw error;
    }
  }

  async getAllHistoricalCandles(
    source: CoinSourceEnum,
    symbol: string,
    coinId: number,
    interval: string = "1m"
  ): Promise<CandlesType[]> {
    const endTime = Date.now();
    const startTime = moment().subtract(60, "months").valueOf(); //60 months ago

    const diapason = 1000 * 60 * 60 * 24 * 200; // 200 days

    let allCandles: CandlesType[] = [];
    let currentStartTime = startTime;

    while (currentStartTime < endTime) {
      const candles = await this.getHistoricalCandles(
        source,
        symbol,
        coinId,
        currentStartTime,
        currentStartTime + diapason,
        interval
      );

      if (candles.length === 0) {
        currentStartTime += diapason;
        continue;
      }

      allCandles = allCandles.concat(candles);
      const lastTimeStamp = candles[candles.length - 1].timestamp;
      currentStartTime = Number(lastTimeStamp) + 1; // Next chunk
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
      const response = await FundingRateLimiter.schedule(() =>
        axios.get(url, { params })
      );
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
    source: CoinSourceEnum.COINMFUTURES | CoinSourceEnum.USDMFUTURES,
    symbol: string,
    startTime: number,
    endTime: number,
    period: string = "5m",
    pair?: string
  ): Promise<OpenInterestBinanceDataInterface[]> {
    const params = {
      limit: 500,
      startTime,
      endTime,
      period,
      headers: {
        "X-MBX-APIKEY": this.apiKey,
      },
      ...(source === CoinSourceEnum.USDMFUTURES
        ? { symbol }
        : { pair: symbol }),
    };

    const apiPrefix = source === CoinSourceEnum.USDMFUTURES ? "f" : "d";
    const url = `https://${apiPrefix}api.binance.com/futures/data/openInterestHist`;

    try {
      const response = await OpenInterestLimiter.schedule(() =>
        axios.get(url, { params })
      );

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
    symbol: string,
    source: CoinSourceEnum.COINMFUTURES | CoinSourceEnum.USDMFUTURES,
    pair?: string
  ): Promise<OpenInterestBinanceDataInterface[]> {
    //exists only for futures
    const endTime = Date.now();
    const startTime = moment().subtract(30, "days").valueOf(); //30 days ago

    let allOpenInterest: OpenInterestBinanceDataInterface[] = [];
    let currentStartTime = startTime;

    while (currentStartTime < endTime) {
      const openInterest = await this.getOpenInterest(
        source,
        symbol,
        currentStartTime,
        endTime,
        "5m",
        pair
      );
      if (openInterest.length === 0) break; // No more data

      allOpenInterest = allOpenInterest.concat(openInterest);
      currentStartTime = openInterest[openInterest.length - 1].timestamp + 1;
    }

    return allOpenInterest;
  }
}

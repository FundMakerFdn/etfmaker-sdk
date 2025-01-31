import axios from "axios";
import { OpenInterestInterface } from "../interfaces/OpenInterest.interface";
import { CandleInterface } from "../interfaces/Candle.interface";
import { CoinSourceEnum } from "../enums/CoinSource.enum";
import { BinanceCoinsDataDto } from "./dto/BinanceCoinsData.dto";
import {
  CoinMFuturesSymbolsLimiter,
  FundingRateLimiter,
  HistoricalCandlesLimiter,
  OpenInterestLimiter,
  SpotsSymbolsLimiter,
  UsdMFuturesSymbolsLimiter,
} from "./limiters";
import { BinanceFundingDto } from "./dto/BinanceFunding.dto";
import { FuturesType } from "../enums/FuturesType.enum";
import moment from "moment";

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
      usdMFutures: new Map<
        string,
        { symbol: string; pair: string; futuresType: FuturesType }
      >(),
      coinMFutures: new Map<
        string,
        { symbol: string; pair: string; futuresType: FuturesType }
      >(),
      spots: new Map<string, { symbol: string }>(),
    } as BinanceCoinsDataDto;

    const futuresContractTypes = {
      PERPETUAL: FuturesType.PERPETUAL,
      CURRENT_QUARTER: FuturesType.CURRENT_QUARTER,
      NEXT_QUARTER: FuturesType.NEXT_QUARTER,
      CURRENT_QUARTER_DELIVERING: FuturesType.DELIVERING,
      NEXT_QUARTER_DELIVERING: FuturesType.DELIVERING,
      "PERPETUAL DELIVERING": FuturesType.DELIVERING,
    };

    const coinMFutures = await this.getCoinMFuturesSymbols();
    coinMFutures.forEach((symbol) =>
      data.coinMFutures.set(symbol.baseAsset, {
        pair: symbol.pair,
        symbol: symbol.symbol,
        futuresType:
          futuresContractTypes[
            symbol.contractType as keyof typeof futuresContractTypes
          ],
      })
    );

    const usdMFutures = await this.getUsdMFuturesSymbols();
    usdMFutures.forEach((symbol) =>
      data.usdMFutures.set(symbol.baseAsset, {
        pair: symbol.pair,
        symbol: symbol.symbol,
        futuresType:
          futuresContractTypes[
            symbol.contractType as keyof typeof futuresContractTypes
          ],
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
    endTime: number
  ): Promise<CandleInterface[]> {
    let url = `${this.apiUrl}/klines`;

    if (source === CoinSourceEnum.USDMFUTURES) {
      url = `${this.fapiUrl}/klines`;
    } else if (source === CoinSourceEnum.COINMFUTURES) {
      url = `${this.dapiUrl}/klines`;
    }

    const params = {
      symbol,
      interval: "1m",
      startTime,
      endTime,
      limit: 1500, // Max candles per request
      headers: {
        "X-MBX-APIKEY": this.apiKey,
      },
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
    startTime: number
  ): Promise<CandleInterface[]> {
    const diapason = 1000 * 60 * 60 * 24 * 200; // 200 days

    let allCandles: CandleInterface[] = [];
    let currentStartTime = startTime;

    while (currentStartTime < Date.now()) {
      let endTime = currentStartTime + diapason;
      if (moment(endTime).isAfter(moment())) {
        endTime = Date.now();
      }
      const candles = await this.getHistoricalCandles(
        source,
        symbol,
        coinId,
        currentStartTime,
        endTime
      );

      if (candles.length === 0) {
        currentStartTime = endTime + 1; // Next day
        continue;
      }

      allCandles = allCandles.concat(candles);
      const lastTimeStamp = candles[candles.length - 1].timestamp;
      currentStartTime = Number(lastTimeStamp) + 1; // Next chunk
    }

    return allCandles;
  }

  private async getFunding(
    symbol: string,
    startTime: number,
    endTime: number,
    source: CoinSourceEnum.COINMFUTURES | CoinSourceEnum.USDMFUTURES
  ): Promise<BinanceFundingDto[]> {
    const url = `${
      source === CoinSourceEnum.USDMFUTURES ? this.fapiUrl : this.dapiUrl
    }/fundingRate`;
    const params = {
      symbol,
      startTime,
      endTime,
      limit: 1000,
      headers: {
        "X-MBX-APIKEY": this.apiKey,
      },
    };

    try {
      const response = await FundingRateLimiter.schedule(() =>
        axios.get(url, { params })
      );
      console.dir({ response: response.data }, { depth: null });
      return response.data.map((rate: Record<string, any>) => ({
        timestamp: rate.fundingTime,
        fundingRate: rate.fundingRate,
      }));
    } catch (error: any) {
      console.error(
        `Error fetching funding rates for ${symbol}:`,
        error.message
      );
      throw error;
    }
  }

  async getAllFunding(
    symbol: string,
    source: CoinSourceEnum.COINMFUTURES | CoinSourceEnum.USDMFUTURES,
    startTime: number
  ): Promise<BinanceFundingDto[]> {
    //exists only for futures
    const endTime = Date.now();

    let allRates: BinanceFundingDto[] = [];
    let currentStartTime = startTime;

    while (currentStartTime < endTime) {
      const rates = await this.getFunding(
        symbol,
        currentStartTime,
        endTime,
        source
      );
      if (rates.length === 0) {
        currentStartTime += 1000 * 60 * 60 * 24; // Next day
        continue;
      } // No more data

      allRates.push(...rates);
      currentStartTime = +rates[rates.length - 1].timestamp + 1; // Next chunk
    }

    return allRates;
  }

  private async getOpenInterest(
    source: CoinSourceEnum.COINMFUTURES | CoinSourceEnum.USDMFUTURES,
    symbol: string,
    startTime: number,
    endTime: number,
    pair?: string
  ): Promise<OpenInterestInterface[]> {
    return OpenInterestLimiter.schedule(async () => {
      const params = {
        limit: 500,
        startTime,
        endTime,
        period: "1d",
        headers: {
          "X-MBX-APIKEY": this.apiKey,
        },
        ...(source === CoinSourceEnum.USDMFUTURES ? { symbol } : { pair }),
      };

      const apiPrefix = source === CoinSourceEnum.USDMFUTURES ? "f" : "d";
      const url = `https://${apiPrefix}api.binance.com/futures/data/openInterestHist`;

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
    });
  }

  // Exists only for futures
  async getAllOpenInterest(
    symbol: string,
    source: CoinSourceEnum.COINMFUTURES | CoinSourceEnum.USDMFUTURES,
    startTime: number,
    pair?: string
  ): Promise<OpenInterestInterface[]> {
    let currentStartTime = startTime;
    const endTime = Date.now();
    const openInterestData: OpenInterestInterface[] = [];

    while (currentStartTime < endTime) {
      const openInterest = await this.getOpenInterest(
        source,
        symbol,
        currentStartTime,
        endTime,
        pair
      );

      if (openInterest.length === 0) {
        currentStartTime += 1000 * 60 * 60 * 24;
        continue;
      }

      openInterestData.push(...openInterest);
      currentStartTime =
        +openInterest[openInterest.length - 1].timestamp + 1000 * 60 * 60 * 24; // Next day
    }

    return openInterestData;
  }

  async getCurrentPrice(
    symbol: string,
    source: CoinSourceEnum
  ): Promise<string> {
    let baseUrl = this.apiUrl;
    if (source === CoinSourceEnum.USDMFUTURES) {
      baseUrl = this.fapiUrl;
    } else if (source === CoinSourceEnum.COINMFUTURES) {
      baseUrl = this.dapiUrl;
    }
    const url = `${baseUrl}/ticker/price`;
    const params = {
      symbol,
    };

    try {
      const response = await axios.get(url, { params });
      return response.data.price;
    } catch (error: any) {
      console.error(
        `Error fetching current price for ${symbol}:`,
        error.message
      );
      throw error;
    }
  }
}

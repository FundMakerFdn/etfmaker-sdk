import axios from "axios";
import { OpenInterestInterface } from "../interfaces/OpenInterest.interface";
import { CandleInterface } from "../interfaces/Candle.interface";
import { CoinSourceEnum } from "../enums/CoinSource.enum";
import { BinanceCoinsDataDto } from "./dto/BinanceCoinsData.dto";
import {
  FundingRateLimiter,
  HistoricalCandlesLimiter,
  HistoricalCandlesLimiterBinanceVision,
  OpenInterestLimiter,
  SpotsSymbolsLimiter,
  UsdMFuturesSymbolsLimiter,
} from "./limiters";
import { BinanceFundingDto } from "./dto/BinanceFunding.dto";
import { FuturesType } from "../enums/FuturesType.enum";
import moment from "moment";
import { DataSource } from "../db/DataSource";
import { Candles, Funding, OpenInterest } from "../db/schema";

export class BinanceService {
  private readonly apiUrl: string;
  private readonly visionApiUrl: string;
  private readonly apiKey: string;
  private readonly fapiUrl: string;
  private readonly secretKey: string;
  private readonly binanceUrl: string;

  constructor() {
    this.apiUrl =
      process.env.BINANCE_API_URL ?? "https://api.binance.com/api/v3";
    this.visionApiUrl =
      process.env.BINANCE_VISION_API_URL ??
      "https://data-api.binance.vision/api/v3";
    this.fapiUrl =
      process.env.BINANCE_FAPI_URL ?? "https://fapi.binance.com/fapi/v1";
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

  private async getSpotsSymbols(): Promise<Record<string, any>[]> {
    const spots = await SpotsSymbolsLimiter.schedule(() =>
      axios.get(this.apiUrl + "/exchangeInfo")
    );

    return spots.data.symbols;
  }

  private async getHistoricalCandles(
    source: CoinSourceEnum,
    symbol: string,
    coinId: number,
    startTime: number,
    endTime: number
  ): Promise<CandleInterface[]> {
    let url = `${this.visionApiUrl}/klines`;

    const params = {
      symbol,
      interval: "1m",
      startTime,
      endTime,
      limit: 1500, // Max candles per request
    };

    try {
      const response = await HistoricalCandlesLimiterBinanceVision.schedule(
        () => axios.get(url, { params })
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
      try {
        let url = `${this.apiUrl}/klines`;

        if (source === CoinSourceEnum.USDMFUTURES) {
          url = `${this.fapiUrl}/klines`;
        }

        const params = {
          symbol,
          interval: "1m",
          startTime,
          endTime,
          limit: 1500, // Max candles per request
        };
        const response = await HistoricalCandlesLimiter.schedule(() =>
          axios.get(url, {
            params,
            headers: {
              "X-MBX-APIKEY": this.apiKey,
            },
          })
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
  }

  async setAllHistoricalCandles(
    source: CoinSourceEnum,
    symbol: string,
    coinId: number,
    startTime: number,
    onProgress: (coinId: number, progress: number) => void
  ): Promise<void> {
    const diapason = 1000 * 60 * 60 * 24 * 200; // 200 days
    const finalTime = Date.now();
    const totalDuration = finalTime - startTime;
    let currentStartTime = startTime;
    let requestCount = 0;

    while (currentStartTime < finalTime) {
      let endTime = currentStartTime + diapason;
      if (endTime > finalTime) {
        endTime = finalTime;
      }
      requestCount++;

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

      await DataSource.transaction(async (tx) => {
        await tx.insert(Candles).values(candles);
      });

      const lastTimeStamp = candles[candles.length - 1].timestamp;
      currentStartTime = Number(lastTimeStamp) + 1;

      const progress = Math.min(
        100,
        ((currentStartTime - startTime) / totalDuration) * 100
      );

      onProgress(coinId, progress);
    }
  }

  private async getFunding(
    symbol: string,
    startTime: number,
    endTime: number
  ): Promise<BinanceFundingDto[]> {
    const url = `${this.fapiUrl}/fundingRate`;
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

  //exists only for futures
  async setAllFunding(
    coinId: number,
    symbol: string,
    startTime: number
  ): Promise<void> {
    const endTime = Date.now();

    let currentStartTime = startTime;

    while (currentStartTime < endTime) {
      const ratesData = await this.getFunding(
        symbol,
        currentStartTime,
        endTime
      );
      if (ratesData.length === 0) {
        currentStartTime += 1000 * 60 * 60 * 24; // Next day
        continue;
      } // No more data

      const insertData = ratesData.map((f) => ({
        coinId,
        timestamp: new Date(f.timestamp),
        fundingRate: f.fundingRate.toString(),
      }));

      await DataSource.insert(Funding).values(insertData);

      currentStartTime = +ratesData[ratesData.length - 1].timestamp + 1; // Next chunk
    }
  }

  private async getOpenInterest(
    symbol: string,
    startTime: number,
    endTime: number
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
        symbol,
      };

      const url = `https://fapi.binance.com/futures/data/openInterestHist`;

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
  async setAllOpenInterest(
    coinId: number,
    symbol: string,
    startTime: number
  ): Promise<void> {
    let currentStartTime = startTime;
    const endTime = Date.now();

    while (currentStartTime < endTime) {
      const openInterest = await this.getOpenInterest(
        symbol,
        currentStartTime,
        endTime
      );

      if (openInterest.length === 0) {
        currentStartTime += 1000 * 60 * 60 * 24;
        continue;
      }

      const insertData = openInterest.map((oi) => ({
        coinId,
        timestamp: new Date(oi.timestamp),
        sumOpenInterest: oi.sumOpenInterest.toString(),
        sumOpenInterestValue: oi.sumOpenInterestValue.toString(),
      }));

      await DataSource.insert(OpenInterest).values(insertData);

      currentStartTime =
        +openInterest[openInterest.length - 1].timestamp + 1000 * 60 * 60 * 24; // Next day
    }
  }

  async getCurrentPrice(
    symbol: string,
    source: CoinSourceEnum
  ): Promise<string> {
    let baseUrl = this.apiUrl;
    if (source === CoinSourceEnum.USDMFUTURES) {
      baseUrl = this.fapiUrl;
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

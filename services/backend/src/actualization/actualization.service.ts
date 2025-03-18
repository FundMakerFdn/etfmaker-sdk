import { eq } from "drizzle-orm";
import { BinanceService } from "../binance/binance.service";
import { CoinGeckoService } from "../coingecko/coingecko.service";
import { DataSource } from "../db/DataSource";
import { CoinSourceEnum } from "../enums/CoinSource.enum";
import { BinanceCoinsDataDto } from "../binance/dto/BinanceCoinsData.dto";
import { CoinInterface } from "../interfaces/Coin.interface";
import { CoinStatusEnum } from "../enums/CoinStatus.enum";
import { RebalanceConfig } from "../interfaces/RebalanceConfig.interface";
import { ProcessingStatusService } from "../processing-status/processing-status.service";
import { ProcessingKeysEnum } from "../enums/Processing.enum";
import { setCandlesData } from "./managers/candles.manager";
import { setFundingsData } from "./managers/fundings.manager";
import { setMarketCapData } from "./managers/market-cap.manager";
import { setOpenInterestData } from "./managers/open-interest.manager";
import { Coins } from "../db/schema/coins";

const coingeckoService = new CoinGeckoService();
const binanceService = new BinanceService();

export class ActualizationService {
  async actualizeData(config: RebalanceConfig): Promise<void> {
    if (
      await ProcessingStatusService.isProcessing(ProcessingKeysEnum.actualizing)
    )
      return;
    try {
      await ProcessingStatusService.setProcessing(
        ProcessingKeysEnum.actualizing
      );

      const topCoinList = await coingeckoService.getCoinList(config.category);
      const binanceCoinSymbols = await binanceService.getBinanceCoinsData();

      const classifiedCoins = this.classifyCoins(
        topCoinList,
        binanceCoinSymbols
      );

      const coins = await this.updateCoinsTable(classifiedCoins);

      await setCandlesData(coins);
      await setMarketCapData(coins);
      await setFundingsData(coins);
      await setOpenInterestData(coins);
      await ProcessingStatusService.setSuccess(ProcessingKeysEnum.actualizing);
    } catch (error) {
      await ProcessingStatusService.setError(ProcessingKeysEnum.actualizing);
      throw error;
    }
  }

  private async updateCoinsTable(
    newCoinsData: Omit<CoinInterface, "id">[]
  ): Promise<CoinInterface[]> {
    const coins = (await DataSource.select().from(Coins)) as CoinInterface[];

    //add new coins to list
    for (const newCoin of newCoinsData) {
      const coin = coins.find(
        (c) =>
          c.assetId === newCoin.assetId &&
          c.source === newCoin.source &&
          c.symbol === newCoin.symbol
      );

      if (!coin) {
        await DataSource.insert(Coins).values(newCoin);
      }
    }

    //mark delisted coins
    // actualize data
    for (const coin of coins) {
      const newCoinData = newCoinsData.find(
        (c) =>
          c.assetId === coin.assetId &&
          c.source === coin.source &&
          c.symbol === coin.symbol
      );
      const updatedData: Partial<Omit<CoinInterface, "id">> = {};

      if (coin.status === CoinStatusEnum.ACTIVE && !newCoinData) {
        await DataSource.update(Coins)
          .set({ status: CoinStatusEnum.DELISTED })
          .where(eq(Coins.id, coin.id));
        updatedData.status = CoinStatusEnum.DELISTED;
      }

      if (coin.status === CoinStatusEnum.DELISTED && !!newCoinData) {
        updatedData.status = CoinStatusEnum.DELISTED;
      }

      if (newCoinData) {
        const updatableKeys: Array<keyof Omit<CoinInterface, "id" | "status">> =
          ["name", "assetId", "source", "symbol", "pair", "futuresType"];

        for (const key of updatableKeys) {
          if (
            newCoinData[key] !== undefined &&
            newCoinData[key] !== null &&
            newCoinData[key] !== coin[key]
          ) {
            updatedData[key] = newCoinData[key] as any;
          }
        }
      }

      if (Object.keys(updatedData).length > 0) {
        await DataSource.update(Coins)
          .set(updatedData)
          .where(eq(Coins.id, coin.id));
      }
    }

    return DataSource.select().from(Coins) as Promise<CoinInterface[]>;
  }

  private classifyCoins(
    coinList: Record<string, any>[],
    binanceCoinSymbols: BinanceCoinsDataDto
  ): Omit<CoinInterface, "id">[] {
    const { usdMFutures, spots } = binanceCoinSymbols;

    const classifiedCoins = coinList.reduce((acc, coin) => {
      const usdMFuturesBinanceData = usdMFutures.get(coin.symbol);
      const spotBinanceData = spots.get(coin.symbol);

      if (usdMFuturesBinanceData) {
        acc.push({
          name: coin.name,
          assetId: coin.id,
          source: CoinSourceEnum.USDMFUTURES,
          symbol: usdMFuturesBinanceData.symbol,
          status: CoinStatusEnum.ACTIVE,
          pair: usdMFuturesBinanceData.pair,
          futuresType: usdMFuturesBinanceData.futuresType,
        });
      }

      if (spotBinanceData) {
        acc.push({
          name: coin.name,
          assetId: coin.id,
          source: CoinSourceEnum.SPOT,
          symbol: spotBinanceData.symbol,
          status: CoinStatusEnum.ACTIVE,
        });
      }

      return acc;
    }, []) as Omit<CoinInterface, "id">[];

    return classifiedCoins;
  }
}

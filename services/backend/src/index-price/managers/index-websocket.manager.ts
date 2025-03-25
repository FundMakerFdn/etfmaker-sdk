import WebSocket from "ws";
import { OhclChartDataType } from "../dto/GetETFPrices.dto";
import { RebalanceDataManager } from "../../rebalance/managers/rebalance-data.manager";
import { RebalanceConfig } from "../../interfaces/RebalanceConfig.interface";
import { OhclGroupByEnum } from "../../enums/OhclGroupBy.enum";
import { CandleInterface } from "../../interfaces/Candle.interface";
import { IndexGenerateManager } from "./index-generate.manager";
import { IndexAggregateManager } from "./index-aggregate.manager";
import { binanceStreamService } from "../../binance/binance.stream.service";
import { DataSource } from "../../db/DataSource";
import { EtfPrice } from "../../db/schema";

export class IndexWebsocketManager {
  private readonly etfId: RebalanceConfig["etfId"];
  private readonly interval: OhclGroupByEnum;

  private lastIndexEtfPrice?: OhclChartDataType;

  private readonly lastAssetsCandles: Map<number, OhclChartDataType> =
    new Map();

  private isBroadcasting = false;
  private readonly clients: Set<WebSocket> = new Set();
  private readonly connections: Map<string, WebSocket> = new Map();

  private readonly rebalanceDataManager: RebalanceDataManager;
  private readonly indexGenerateManager: IndexGenerateManager;
  private readonly indexAggregateManager: IndexAggregateManager;

  public status: "running" | "idle" | "error" = "idle";

  constructor(
    etfId: RebalanceConfig["etfId"],
    interval: OhclGroupByEnum,
    price?: OhclChartDataType
  ) {
    this.etfId = etfId;
    this.interval = interval;
    this.rebalanceDataManager = new RebalanceDataManager();
    this.indexGenerateManager = new IndexGenerateManager();
    this.indexAggregateManager = new IndexAggregateManager();
    this.lastIndexEtfPrice = price;
  }

  public subscripeToIndexPrice(socket: WebSocket) {
    this.clients.add(socket);
  }

  public unsubscribeFromIndexPrice(socket: WebSocket) {
    this.clients.delete(socket);
  }

  public async broadcastIndexPrice() {
    if (this.isBroadcasting) {
      return;
    }
    this.isBroadcasting = true;

    const assets = await this.rebalanceDataManager.getAssets(this.etfId);

    const rebalancePrice =
      await this.rebalanceDataManager.getRebalanceLastPrice(this.etfId);

    const indexDataByTime = new Map<Date, CandleInterface[]>();

    const assetAmount = assets.length;

    let timer: NodeJS.Timeout;

    const onMessage = async (data: CandleInterface) => {
      data.timestamp = new Date(
        Math.floor(data.timestamp.getTime() / 60000) * 60000
      );
      let assetsData = indexDataByTime.get(data.timestamp);

      if (!assetsData || assetsData?.length === 0) {
        assetsData = [];
        indexDataByTime.set(data.timestamp, assetsData);
      } else if (assetsData.some((p) => p.coinId === data.coinId)) {
        return;
      }

      assetsData.push(data);

      for (const [time, assetOhcl] of indexDataByTime.entries()) {
        if (assetOhcl.length === assetAmount) {
          indexDataByTime.delete(time);
          this.status = "running";
          clearTimeout(timer);
          timer = setTimeout(() => {
            this.status = "idle";
          }, 1000 * 60 * 2);

          try {
            const indexOhcl = await this.calculateOhclPriceInLive(
              assetOhcl,
              rebalancePrice
            );

            if (!indexOhcl) {
              continue;
            }

            this.lastIndexEtfPrice = indexOhcl;
            for (const client of this.clients) {
              client.send(JSON.stringify(indexOhcl));
            }

            await DataSource.insert(EtfPrice)
              .values({
                etfId: this.etfId as string,
                timestamp: new Date(indexOhcl.time * 1000),
                open: indexOhcl.open,
                high: indexOhcl.high,
                low: indexOhcl.low,
                close: indexOhcl.close,
              })
              .onConflictDoNothing()
              .execute();
          } catch (error) {
            console.error(error);
            this.status = "error";
          }
        }
      }
    };

    assets.forEach((asset) => {
      binanceStreamService.addAsset(asset.symbol);
      binanceStreamService.subscribeToAssetCandles(
        asset.symbol,
        (data: CandleInterface) => onMessage(data)
      );
    });
  }

  private connectWSS(
    symbol: string,
    coinId: number,
    onMessage: (data: CandleInterface) => void,
    reconnection: number = 0
  ): WebSocket | undefined {
    if (this.connections.has(symbol)) return this.connections.get(symbol);

    const ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${
        this.interval
      }`
    );

    ws.on("open", () => {
      this.connections.set(symbol, ws);
    });

    ws.on("message", async (data: WebSocket.Data) => {
      const indexPrice = JSON.parse(
        Buffer.from(data as ArrayBuffer).toString("utf-8")
      );

      onMessage({
        coinId,
        timestamp: new Date(indexPrice.k.t),
        open: indexPrice.k.o,
        high: indexPrice.k.h,
        low: indexPrice.k.l,
        close: indexPrice.k.c,
        volume: indexPrice.k.v,
      });
    });

    ws.on("ping", () => {
      ws.pong();
    });

    ws.on("close", () => {
      this.connections.delete(symbol);
      this.status = "error";
      reconnection < 3 &&
        setTimeout(
          () => this.connectWSS(symbol, coinId, onMessage, 1 + reconnection),
          5000
        );
    });

    ws.on("error", (error) => {
      ws.close();
      this.connections.delete(symbol);
    });

    return ws;
  }

  private async calculateOhclPriceInLive(
    data: Array<CandleInterface>,
    initialRebalancePrice: number
  ): Promise<OhclChartDataType | undefined> {
    const prices = [];

    for (const price of data) {
      const lastPrice = this.lastAssetsCandles.get(price.coinId);

      this.lastAssetsCandles.set(price.coinId, {
        open: price.open,
        high: price.high,
        low: price.low,
        close: price.close,
        time: price.timestamp.getTime() / 1000,
      });

      if (!lastPrice) continue;

      prices.push({
        coinId: price.coinId,
        startTime: {
          coinId: price.coinId,
          open: lastPrice?.open,
          high: lastPrice?.high,
          low: lastPrice?.low,
          close: lastPrice?.close,
          volume: price.volume,
          timestamp: new Date(lastPrice.time * 1000),
        },
        endTime: {
          coinId: price.coinId,
          open: price.open,
          high: price.high,
          low: price.low,
          close: price.close,
          volume: price.volume,
          timestamp: price.timestamp,
        },
      });
    }

    const previousPrice = this.lastIndexEtfPrice?.close
      ? +this.lastIndexEtfPrice.close
      : initialRebalancePrice;

    if (prices.length === 0) {
      return;
    }

    const timestamp = prices[0].startTime.timestamp.getTime();

    const assetsWithWeights = await this.indexGenerateManager.setAssetWeights(
      prices,
      timestamp,
      new Date().getTime()
    );

    const amountPerContracts = this.indexGenerateManager.setAmountPerContracts(
      assetsWithWeights,
      initialRebalancePrice
    );

    const etfCandle = this.indexGenerateManager.getCloseETFPrice(
      previousPrice,
      amountPerContracts
    );

    const kandle = {
      etfId: this.etfId as string,
      time: timestamp / 1000,
      open: etfCandle.open,
      high: etfCandle.high,
      low: etfCandle.low,
      close: etfCandle.close,
    };

    return kandle;
  }

  public closeConnection(): void {
    for (const ws of this.connections.values()) {
      ws.close();
    }
  }
}

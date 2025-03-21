import WebSocket from "ws";
import { OhclChartDataType } from "../dto/GetETFPrices.dto";
import { RebalanceDataManager } from "../../rebalance/managers/rebalance-data.manager";
import { RebalanceConfig } from "../../interfaces/RebalanceConfig.interface";
import { OhclGroupByEnum } from "../../enums/OhclGroupBy.enum";
import { PricesDto } from "../../interfaces/Rebalance.interface";
import { CandleInterface } from "../../interfaces/Candle.interface";
import { IndexGenerateManager } from "./index-generate.manager";
import { IndexAggregateManager } from "./index-aggregate.manager";

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

    for (const asset of assets) {
      const lastCoinCandle = await this.indexAggregateManager.getCoinLastOHCL(
        asset.id
      );
      this.lastAssetsCandles.set(asset.id, lastCoinCandle);
    }

    const rebalancePrice =
      await this.rebalanceDataManager.getRebalanceLastPrice(this.etfId);

    const indexDataByTime = new Map<Date, CandleInterface[]>();

    const assetAmount = assets.length;

    const onMessage = async (data: CandleInterface) => {
      const assetsData = indexDataByTime.get(data.timestamp) ?? [];

      if (assetsData.some((p) => p.coinId === data.coinId)) {
        return;
      }

      indexDataByTime.set(data.timestamp, [...assetsData, data]);

      for (const [time, assetOhcl] of indexDataByTime.entries()) {
        if (assetOhcl.length === assetAmount) {
          const indexOhcl = await this.calculateOhclPriceInLive(
            assetOhcl,
            rebalancePrice
          );
          this.lastIndexEtfPrice = indexOhcl;
          for (const client of this.clients) {
            client.send(JSON.stringify(indexOhcl));
          }
          indexDataByTime.delete(time);
        }
      }
    };

    assets.forEach((asset) =>
      this.connectWSS(asset.symbol, asset.id, onMessage)
    );
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
  ): Promise<OhclChartDataType> {
    const prices = data.map<PricesDto>((price) => {
      const lastPrice = this.lastAssetsCandles.get(price.coinId);

      this.lastAssetsCandles.set(price.coinId, {
        open: price.open,
        high: price.high,
        low: price.low,
        close: price.close,
        time: price.timestamp.getTime() / 1000,
      });

      return {
        coinId: price.coinId,
        startTime: {
          coinId: price.coinId,
          open: lastPrice?.open ?? price.close,
          high: lastPrice?.high ?? price.high,
          low: lastPrice?.low ?? price.low,
          close: lastPrice?.close ?? price.close,
          volume: price.volume,
          timestamp: lastPrice?.time
            ? new Date(lastPrice.time * 1000)
            : price.timestamp,
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
      };
    });

    const previousPrice = this.lastIndexEtfPrice?.close
      ? +this.lastIndexEtfPrice.close
      : initialRebalancePrice;

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
}

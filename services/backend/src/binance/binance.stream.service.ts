import WebSocket from "ws";
import { CandleInterface } from "../interfaces/Candle.interface";

class AssetCandlesStream {
  private readonly symbol: string;
  private readonly connections: Set<WebSocket> = new Set();

  public closeConnection?: () => void;

  constructor(symbol: string) {
    this.symbol = symbol;
  }

  public subscribe(
    onMessage: (data: CandleInterface) => void,
    onError: (error: any) => void,
    onClose: () => void,
    reconnections = 0
  ): void {
    if (reconnections > 3) {
      console.error(`Max reconnections reached for ${this.symbol}`);
      return;
    }

    const ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${this.symbol.toLowerCase()}@kline_1m`
    );

    ws.on("message", async (data: WebSocket.Data) => {
      const indexPrice = JSON.parse(
        Buffer.from(data as ArrayBuffer).toString("utf-8")
      );

      onMessage(indexPrice);
    });

    ws.on("ping", () => {
      ws.pong();
    });

    ws.on("close", () => {
      this.connections.delete(ws);
      setTimeout(
        () => this.subscribe(onMessage, onError, onClose, reconnections + 1),
        5000
      );
    });

    ws.on("error", (error) => {
      ws.close();
      this.connections.delete(ws);
      setTimeout(
        () => this.subscribe(onMessage, onError, onClose, reconnections + 1),
        5000
      );
    });

    this.connections.add(ws);

    this.closeConnection = () => {
      ws.close();
      this.connections.delete(ws);
      onClose();
    };
  }
}

class BinanceStreamService {
  private readonly assets: Set<string> = new Set<string>();
  private readonly assetsToRemove: Set<string> = new Set<string>();
  private readonly connections: Map<string, AssetCandlesStream> = new Map();

  private readonly subscribers: Map<string, Function[]> = new Map();

  public addAsset(asset: string): void {
    if (this.assets.has(asset)) return;

    this.assets.add(asset);
    this.runCandlesStream();
  }

  public removeAsset(asset: string): void {
    this.assets.delete(asset);
    this.assetsToRemove.add(asset);
    this.runCandlesStream();
  }

  public runCandlesStream(): void {
    for (const symbol of this.assets) {
      if (this.connections.has(symbol)) continue;

      const assetStream = new AssetCandlesStream(symbol);
      this.connections.set(symbol, assetStream);

      assetStream.subscribe(
        (data) => {
          if (!this.subscribers.has(symbol)) return;

          this.subscribers
            .get(symbol)
            ?.forEach((subscriber) => subscriber(data));
        },
        (error) => {
          console.error(`Error on ${symbol} stream`, error);
          this.connections.delete(symbol);
        },
        () => {
          this.connections.delete(symbol);
        }
      );
    }

    for (const symbol of this.assetsToRemove) {
      if (!this.connections.has(symbol)) continue;

      this.connections.get(symbol)?.closeConnection?.();
      this.connections.delete(symbol);
      this.assetsToRemove.delete(symbol);
    }
  }

  public subscribeToAssetCandles(symbol: string, callback: Function): void {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, []);
    }

    this.subscribers.get(symbol)?.push(callback);
  }
}

export const binanceStreamService = new BinanceStreamService();

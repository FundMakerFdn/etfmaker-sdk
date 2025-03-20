import WebSocket from "ws";
import { OhclChartDataType } from "../dto/GetETFPrices.dto";
import { RebalanceDataManager } from "../../rebalance/managers/rebalance-data.manager";
import { RebalanceConfig } from "../../interfaces/RebalanceConfig.interface";

export class IndexWebsocketManager {
  private readonly etfId: RebalanceConfig["etfId"];
  private isBroadcasting = false;
  private readonly clients: Set<WebSocket> = new Set();
  private readonly connections: Map<string, WebSocket> = new Map();

  private readonly rebalanceDataManager: RebalanceDataManager;

  constructor(etfId: RebalanceConfig["etfId"]) {
    this.etfId = etfId;
    this.rebalanceDataManager = new RebalanceDataManager();
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

    const indexDataByTime = new Map<number, OhclChartDataType[]>();

    const assetAmount = assets.length;

    const onMessage = (data: OhclChartDataType & { symbol: string }) => {
      indexDataByTime.set(data.time, [
        ...(indexDataByTime.get(data.time) || []),
        {
          time: data.time,
          open: data.open,
          high: data.high,
          close: data.close,
          low: data.low,
        },
      ]);

      for (const [time, assetOhcl] of indexDataByTime.entries()) {
        if (assetOhcl.length === assetAmount) {
          const indexOhcl = {};
          for (const client of this.clients) {
            client.send(JSON.stringify(indexOhcl));
          }
          indexDataByTime.delete(time);
        }
      }
    };

    assets.forEach((asset) => this.connectWSS(asset.symbol, onMessage));
  }

  private connectWSS(
    symbol: string,
    onMessage: (data: OhclChartDataType & { symbol: string }) => void,
    reconnection: number = 0
  ): WebSocket | undefined {
    if (this.connections.has(symbol)) return this.connections.get(symbol);

    const ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth`
    );

    ws.on("open", () => {
      this.connections.set(symbol, ws);
    });

    ws.on("message", async (data: WebSocket.Data) => {
      onMessage({
        symbol,
        time: new Date().getTime() / 1000,
        open: "0",
        high: "0",
        low: "0",
        close: data as string,
      });
    });

    ws.on("ping", () => {
      ws.pong();
    });

    ws.on("close", () => {
      this.connections.delete(symbol);
      reconnection < 3 &&
        setTimeout(
          () => this.connectWSS(symbol, onMessage, 1 + reconnection),
          5000
        );
    });

    ws.on("error", (error) => {
      ws.close();
      this.connections.delete(symbol);
    });

    return ws;
  }
}

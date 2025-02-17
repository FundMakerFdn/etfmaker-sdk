import kafkaService from "../kafka/kafka.service";
import WebSocket from "ws";
import { DataProcessingService } from "../coindata/data-processing.service";

const dataProcessingService = new DataProcessingService();

export class OrderBookProducerService {
  private readonly connections: Map<number, WebSocket> = new Map();

  async openStreamOrderBook() {
    this.closeStreamOrderBook(); // Close existing connections before opening new ones

    try {
      const coins = await dataProcessingService.getAllSpotUsdtPairs();

      if (!coins?.length || coins?.length === 0) {
        console.log("No symbols found for streaming order book.");
        return;
      }

      coins.forEach(({ id, symbol }) => {
        this.connectWSS(symbol, id);
      });
    } catch (error) {
      console.error("Error streaming order book:", error);
    }
  }

  private closeStreamOrderBook() {
    if (this.connections.size === 0) return;

    this.connections.forEach((connection) => connection.close());
    this.connections.clear();
    console.log("Order book streaming connections closed.");
  }

  private connectWSS(
    symbol: string,
    coinId: number,
    reconnection: number = 0
  ): WebSocket | undefined {
    if (this.connections.has(coinId)) return this.connections.get(coinId);

    const ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth`
    );

    ws.on("open", () => {
      this.connections.set(coinId, ws);
    });

    ws.on(
      "message",
      async (data: WebSocket.Data) =>
        await this.sendMessageToKafka(data, coinId)
    );

    ws.on("ping", () => {
      ws.pong();
    });

    ws.on("close", () => {
      this.connections.delete(coinId);
      reconnection < 3 &&
        setTimeout(
          () => this.connectWSS(symbol, coinId, 1 + reconnection),
          5000
        );
    });

    ws.on("error", (error) => {
      ws.close();
      this.connections.delete(coinId);
    });

    return ws;
  }

  private async sendMessageToKafka(data: WebSocket.Data, coinId: number) {
    const orderBookUpdate = JSON.parse(
      Buffer.from(data as ArrayBuffer).toString("utf-8")
    );

    await kafkaService.sendMessage(
      `binance_orderbook_${coinId}`,
      orderBookUpdate
    );
  }
}

const orderBookProducerService = new OrderBookProducerService();
export default orderBookProducerService;

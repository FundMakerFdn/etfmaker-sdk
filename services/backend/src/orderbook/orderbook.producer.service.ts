import { DataSource } from "../db/DataSource";
import { Coins, Rebalance } from "../db/schema";
import kafkaService from "../kafka/kafka.service";
import WebSocket from "ws";
import { desc, inArray } from "drizzle-orm";
import { AmountPerContracts } from "../interfaces/Rebalance.interface";

export class OrderBookProducerService {
  private readonly connections: Map<string, WebSocket> = new Map();

  async openStreamOrderBook() {
    this.closeStreamOrderBook(); // Close existing connections before opening new ones

    try {
      const coinSymbols = (
        await DataSource.select({ data: Rebalance.data })
          .from(Rebalance)
          .orderBy(desc(Rebalance.timestamp))
          .limit(1)
      )?.[0]?.data as AmountPerContracts[];

      if (!coinSymbols?.length || coinSymbols?.length === 0) {
        console.log("No coin symbols found for streaming order book.");
        return;
      }

      const symbols = (
        await DataSource.select({ symbol: Coins.symbol })
          .from(Coins)
          .where(
            inArray(
              Coins.id,
              coinSymbols.map((coin) => coin.coinId)
            )
          )
      )?.map((coin) => coin.symbol);

      if (!symbols?.length || symbols?.length === 0) {
        console.log("No symbols found for streaming order book.");
        return;
      }

      symbols.forEach((symbol) => {
        this.connectWSS(symbol);
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

  private connectWSS(symbol: string): WebSocket | undefined {
    if (this.connections.has(symbol)) return this.connections.get(symbol);

    const ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth`
    );

    ws.on("open", () => {
      this.connections.set(symbol, ws);
      console.log(`Connected to Binance WebSocket for ${symbol}.`);
    });

    ws.on(
      "message",
      async (data: WebSocket.Data) =>
        await this.sendMessageToKafka(data, symbol)
    );

    ws.on("ping", () => {
      ws.pong();
    });

    ws.on("close", () => {
      console.log(
        `WebSocket connection for ${symbol} closed. Reconnecting in 5s...`
      );
      this.connections.delete(symbol);
      setTimeout(() => this.connectWSS(symbol), 5000);
    });

    ws.on("error", (error) => {
      console.error(`WebSocket error for ${symbol}:`, error);
      ws.close();
      this.connections.delete(symbol);
    });

    return ws;
  }

  private async sendMessageToKafka(data: WebSocket.Data, symbol: string) {
    let message: string;

    if (typeof data === "string") {
      message = data;
    } else if (data instanceof Buffer) {
      message = data.toString("utf-8");
    } else if (data instanceof ArrayBuffer) {
      message = Buffer.from(data).toString("utf-8");
    } else {
      throw new Error("Unexpected WebSocket message type");
    }

    const orderBookUpdate = JSON.parse(message);
    await kafkaService.sendMessage(
      `binance_orderbook_${symbol}`,
      orderBookUpdate
    );
  }
}

const orderBookProducerService = new OrderBookProducerService();
export default orderBookProducerService;

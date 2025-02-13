import { DataSource } from "../db/DataSource";
import { Coins, Rebalance } from "../db/schema";
import kafkaService from "../kafka/kafka.service";
import WebSocket from "ws";
import { desc, inArray } from "drizzle-orm";
import { AmountPerContracts } from "../interfaces/Rebalance.interface";

export class OrderBookProducerService {
  private readonly connections: Map<number, WebSocket> = new Map();

  async openStreamOrderBook() {
    this.closeStreamOrderBook(); // Close existing connections before opening new ones

    try {
      const coins = (
        await DataSource.select({ data: Rebalance.data })
          .from(Rebalance)
          .orderBy(desc(Rebalance.timestamp))
          .limit(1)
      )?.[0]?.data as AmountPerContracts[];

      if (!coins?.length || coins?.length === 0) {
        console.log("No coin symbols found for streaming order book.");
        return;
      }

      const symbols = (
        await DataSource.select({ symbol: Coins.symbol, id: Coins.id })
          .from(Coins)
          .where(
            inArray(
              Coins.id,
              coins.map((coin) => coin.coinId)
            )
          )
      )?.map((coin) => ({ coinId: coin.id, symbol: coin.symbol }));

      if (!symbols?.length || symbols?.length === 0) {
        console.log("No symbols found for streaming order book.");
        return;
      }

      symbols.forEach(({ coinId, symbol }) => {
        this.connectWSS(symbol, coinId);
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

  private connectWSS(symbol: string, coinId: number): WebSocket | undefined {
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
      console.log(
        `WebSocket connection for ${symbol} closed. Reconnecting in 5s...`
      );
      this.connections.delete(coinId);
      setTimeout(() => this.connectWSS(symbol, coinId), 5000);
    });

    ws.on("error", (error) => {
      console.error(`WebSocket error for ${symbol}:`, error);
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

import { DataSource } from "../db/DataSource";
import { Coins, Rebalance } from "../db/schema";
import kafkaService from "../kafka/kafka.service";
import WebSocket from "ws";
import { desc, inArray } from "drizzle-orm";
import { AmountPerContracts } from "../interfaces/Rebalance.interface";
import moment from "moment";
import { OrderBookInterface } from "../interfaces/OrderBook.interface";

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
    const orderBookUpdate = JSON.parse(
      Buffer.from(data as ArrayBuffer).toString("utf-8")
    );

    if (!orderBookUpdate.b.length || !orderBookUpdate.a.length) return;
    const bestBid = parseFloat(orderBookUpdate.b[0][0]);
    const bestAsk = parseFloat(orderBookUpdate.a[0][0]);
    const spread = ((bestAsk - bestBid) / bestAsk) * 100;

    const bidDepth = orderBookUpdate.b.reduce(
      (acc: number, [_price, quantity]: [string, string]) =>
        acc + parseFloat(quantity),
      0
    );
    const askDepth = orderBookUpdate.a.reduce(
      (acc: number, [_price, quantity]: [string, string]) =>
        acc + parseFloat(quantity),
      0
    );

    const spreadData = {
      symbol,
      time: moment().valueOf(),
      spread: spread.toFixed(4),
      bidDepth: bidDepth.toFixed(4),
      askDepth: askDepth.toFixed(4),
    } satisfies OrderBookInterface;

    await kafkaService.sendMessage(`binance_orderbook_${symbol}`, spreadData);
  }
}

const orderBookProducerService = new OrderBookProducerService();
export default orderBookProducerService;

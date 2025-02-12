import WebSocket from "ws";
import kafkaService from "../kafka/kafka.service";
import moment from "moment";
import { OrderBookInterface } from "../interfaces/OrderBook.interface";

class OrderBookConsumerService {
  private readonly clients: Set<{ socket: WebSocket; symbol: string }> =
    new Set();

  private readonly symbolsInprocessing: Set<string> = new Set();

  async setClient(socket: WebSocket, symbol: string) {
    this.clients.add({ socket, symbol });

    socket.on("close", () => {
      this.clients.delete({ socket, symbol });
    });
    await this.processSpread();
  }

  async processSpread() {
    const newSymbols = Array.from(this.clients).reduce(
      (acc, { symbol }) =>
        this.symbolsInprocessing.has(symbol) ? acc : [...acc, symbol],
      [] as string[]
    );

    if (newSymbols.length === 0) return;

    await kafkaService.disconnectConcumers();

    for (const symbol of newSymbols) {
      const onMessage = (orderBook: OrderBookInterface) => {
        for (const { socket, symbol: clientSymbol } of this.clients) {
          if (clientSymbol === orderBook.symbol && socket.readyState === 1) {
            socket.send(JSON.stringify(orderBook));
          }
        }
      };

      await kafkaService.startConsumer(
        `binance_orderbook_${symbol}`,
        onMessage
      );
    }
  }
}

const orderBookConsumerService = new OrderBookConsumerService();
export default orderBookConsumerService;

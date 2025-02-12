import { DataSource } from "../db/DataSource";
import { OrderBook } from "../db/schema";
import { OrderBookInterface } from "../interfaces/OrderBook.interface";
import kafkaService from "../kafka/kafka.service";

export class OrderBookHistoricalService {
  async getSpreadData(symbol: string, from: number, to: number) {}

  async connectHistoricalOrderBookConsumer(coinSymbols: []) {
    for (const symbol of coinSymbols) {
      const onMessage = async (orderBook: OrderBookInterface) => {
        // await DataSource.insert(OrderBook).values([orderBook]);
      };

      await kafkaService.startConsumer(
        `binance_orderbook_${symbol}`,
        onMessage
      );
    }
  }
}

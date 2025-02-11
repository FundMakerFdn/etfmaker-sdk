import WebSocket from "ws";
import kafkaService from "../kafka/kafka.service";

class OrderBookConsumerService {
  private readonly clients: Set<{ socket: WebSocket; symbol: string }> =
    new Set();

  private readonly symbolsInprocessing: Set<string> = new Set();

  async setClient(socket: WebSocket, symbol: string) {
    this.clients.add({ socket, symbol });

    socket.on("close", () => {
      this.clients.delete({ socket, symbol });
      console.log(`❌ Client unsubscribed: ${symbol}`);
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

    for (const symbol of newSymbols) {
      const onMessage = (message: any) => {
        const orderBook = JSON.parse(message.value.toString());

        if (!orderBook.b.length || !orderBook.a.length) return;
        const bestBid = parseFloat(orderBook.b[0][0]);
        const bestAsk = parseFloat(orderBook.a[0][0]);
        const spread = ((bestAsk - bestBid) / bestAsk) * 100;

        console.log(`📊 Spread for ${symbol}: ${spread.toFixed(4)}%`);
        const spreadData = { symbol, spread: spread.toFixed(4) };

        for (const { socket, symbol: clientSymbol } of this.clients) {
          if (clientSymbol === symbol && socket.readyState === 1) {
            socket.send(JSON.stringify(spreadData));
          }
        }
      };

      await kafkaService.startConsumer(
        `binance_orderbook_${symbol}`,
        "orderbook-consumer",
        onMessage
      );
    }
  }
}

const orderBookConsumerService = new OrderBookConsumerService();
export default orderBookConsumerService;

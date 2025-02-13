import WebSocket from "ws";
import kafkaService from "../../kafka/kafka.service";
import { OrderBookInterface } from "../../interfaces/OrderBook.interface";
import moment from "moment";
import { RebalanceDataManager } from "../../coindata/managers/rebalance-data.manager";

class OrderBookConsumerService {
  private readonly orderBookByCoinClients: Set<{
    socket: WebSocket;
    coinId: number;
  }> = new Set();

  private readonly coinsInprocessing: Set<number> = new Set();

  async setOrderBookByCoinClient(socket: WebSocket, coinId: number) {
    this.orderBookByCoinClients.add({ socket, coinId });

    socket.on("close", () => {
      this.orderBookByCoinClients.delete({ socket, coinId });
    });
    await this.processSpread();
  }
  async processSpread() {
    const newCoinIds = Array.from(this.orderBookByCoinClients).reduce(
      (acc, { coinId }) =>
        this.coinsInprocessing.has(coinId) ? acc : [...acc, coinId],
      [] as number[]
    );

    if (newCoinIds.length === 0) return;

    for (const coinId of newCoinIds) this.coinsInprocessing.add(coinId);

    for (const coinId of newCoinIds) {
      const weight = await RebalanceDataManager.getAssetRebalanceWeight(coinId);

      const onMessage = (orderBookUpdate: any) => {
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

        const orderBook = {
          coinId,
          time: Math.floor(moment().valueOf() / 1000).toString(),
          spread: spread.toFixed(4),
          bidDepth: bidDepth.toFixed(4),
          askDepth: askDepth.toFixed(4),
          spreadDepthPercentage: this.calculateSpreadDepthPercentage(
            {
              asks: orderBookUpdate.a,
              bids: orderBookUpdate.b,
            },
            weight
          ),
        } satisfies OrderBookInterface;

        for (const { socket, coinId: clientCoinId } of this
          .orderBookByCoinClients) {
          if (clientCoinId === orderBook.coinId && socket.readyState === 1) {
            socket.send(JSON.stringify(orderBook));
          }
        }
      };

      await kafkaService.addListenerToConsumer(
        `binance_orderbook_${coinId}`,
        onMessage
      );
    }
  }

  public calculateSpreadDepthPercentage(
    orderBook: { asks: [number, number][]; bids: [number, number][] },
    amount: number
  ): number {
    const { asks, bids } = orderBook;

    let accumulatedAmount = 0;
    let weightedPriceSum = 0;

    for (const [price, volume] of asks) {
      const availableVolume = Math.min(volume, amount - accumulatedAmount);
      accumulatedAmount += availableVolume;
      weightedPriceSum += availableVolume * price;

      if (accumulatedAmount >= amount) break;
    }

    const averagePurchasePrice = weightedPriceSum / accumulatedAmount;
    const bestBid = bids[0][0];
    const spreadDepthPercentage =
      ((averagePurchasePrice - bestBid) / bestBid) * 100;

    return spreadDepthPercentage;
  }
}

const orderBookConsumerService = new OrderBookConsumerService();
export default orderBookConsumerService;

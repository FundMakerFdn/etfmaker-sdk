import WebSocket from "ws";
import { RebalanceDataManager } from "../../coindata/managers/rebalance-data.manager";
import kafkaService from "../../kafka/kafka.service";
import orderBookConsumerService from "./orderbook";

class EtfWeightedSpreadConsumer {
  private readonly etfWeightedCoinClients: Set<WebSocket> = new Set();

  private readonly etfClientsInprocessing: Set<WebSocket> = new Set();

  async setEtfWeightedClient(socket: WebSocket) {
    this.etfWeightedCoinClients.add(socket);

    socket.on("close", () => {
      this.etfWeightedCoinClients.delete(socket);
    });
    await this.calculateEtfWeightedAverageSpread();
  }

  private async calculateEtfWeightedAverageSpread() {
    const newClientSockets = Array.from(this.etfWeightedCoinClients).reduce(
      (acc, socket) =>
        this.etfClientsInprocessing.has(socket) ? acc : [...acc, socket],
      [] as WebSocket[]
    );

    if (newClientSockets.length === 0) return;

    for (const socket of newClientSockets)
      this.etfClientsInprocessing.add(socket);

    const rebalanceAssets = await RebalanceDataManager.getLatestRebalanceData();
    const rebalanceAssetsIds = rebalanceAssets.data.map(
      (asset) => asset.coinId
    );
    const rebalanceWeights = new Map<number, number>();

    const latestOrderBooks = new Map<number, any>();

    const totalAmount = +rebalanceAssets.price;

    for (const coinId of rebalanceAssetsIds) {
      if (!rebalanceWeights.has(coinId)) {
        const weight = await RebalanceDataManager.getAssetRebalanceWeight(
          coinId
        );
        rebalanceWeights.set(coinId, weight);
      }

      const onMessage = (orderBookUpdate: any) => {
        if (!orderBookUpdate.b.length || !orderBookUpdate.a.length) return;

        latestOrderBooks.set(coinId, orderBookUpdate);
        this.recalculateEtfWeightedAverageSpread({
          rebalanceWeights,
          latestOrderBooks,
          totalAmount,
          rebalanceAssetsIds,
          newClientSockets,
        });
      };

      await kafkaService.addListenerToConsumer(
        `binance_orderbook_${coinId}`,
        onMessage
      );
    }
  }

  private recalculateEtfWeightedAverageSpread({
    rebalanceWeights,
    latestOrderBooks,
    totalAmount,
    rebalanceAssetsIds,
    newClientSockets,
  }: {
    rebalanceWeights: Map<number, number>;
    latestOrderBooks: Map<number, any>;
    totalAmount: number;
    rebalanceAssetsIds: number[];
    newClientSockets: WebSocket[];
  }) {
    let weightedSpreadSum = 0;
    let totalInvestment = 0;

    for (const coinId of rebalanceAssetsIds) {
      const weight = rebalanceWeights.get(coinId);
      const orderBook = latestOrderBooks.get(coinId);
      if (!weight || !orderBook) continue;

      const amountToInvest = totalAmount * weight;

      const spreadDepthPercentage =
        orderBookConsumerService.calculateSpreadDepthPercentage(
          {
            asks: orderBook.a,
            bids: orderBook.b,
          },
          weight
        );

      const bestAsk = orderBook.a[0][0];
      const investmentValue = amountToInvest * bestAsk;

      weightedSpreadSum += investmentValue * spreadDepthPercentage;
      totalInvestment += investmentValue;
    }

    const averageWeightedSpread = weightedSpreadSum / totalInvestment;

    if (
      !averageWeightedSpread ||
      isNaN(averageWeightedSpread) ||
      averageWeightedSpread === null
    )
      return;

    newClientSockets.forEach((socket) => {
      if (socket.readyState === 1) {
        socket.send(
          JSON.stringify({
            averageWeightedSpread,
          })
        );
      }
    });
  }
}

const etfWeightedSpreadConsumer = new EtfWeightedSpreadConsumer();
export default etfWeightedSpreadConsumer;

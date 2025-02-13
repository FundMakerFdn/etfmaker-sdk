import fastifyKafkaJS from "fastify-kafkajs";
import { Producer, Partitioners } from "kafkajs";
import { sleep } from "../helpers/sleep";
import { RebalanceDataManager } from "../coindata/managers/rebalance-data.manager";

const KAFKA_URL = process.env.KAFKA_URL ?? "localhost:9092";

export class KafkaService {
  private kafka: any = null;
  private producer: Producer | null = null;
  private consumer: any = null;
  private readonly createdTopics: Map<string, Array<(data: any) => void>> =
    new Map();

  private readonly subscribedTopicsCallbacks: Map<
    string,
    Array<(data: any, topic: string) => void>
  > = new Map();
  private consumerRunning: "stopped" | "starting" | "running" = "stopped";

  /** Connect Kafka Producer */
  async connectKafka(fastify: any) {
    console.log("Kafka connection...");
    if (this.checkIfKafkaConnected()) return;
    await sleep(5000);
    try {
      await fastify.register(fastifyKafkaJS, {
        clientConfig: {
          brokers: [KAFKA_URL],
          clientId: "fund_maker_sdk",
        },
        producerConfig: {
          createPartitioner: Partitioners.DefaultPartitioner,
        },
      });
    } catch (e) {
      console.log("KAFKA ERROR", e);
      await this.connectKafka(fastify);
      return;
    }
    this.producer = fastify.kafka.producer;
    this.kafka = fastify.kafka;
    this.consumer = fastify.kafka.client.consumer({
      groupId: "fund_maker_sdk",
      sessionTimeout: 45000,
      heartbeatInterval: 5000,
      maxPollInterval: 60000,
      retry: {
        retries: 5,
      },
    });
    await this.consumer.connect();
    console.log("Kafka Service Connected ✅");
  }

  /** Send message to a Kafka topic */
  async sendMessage(topic: string, message: object) {
    if (!this.checkIfKafkaConnected()) return;

    await this.producer!.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
  }

  /** Start Kafka Consumer for a given topic */
  async addListenerToConsumer(
    topic: string,
    onMessage: (message: any) => void
  ) {
    if (!this.checkIfKafkaConnected()) return;
    await this.startConsumerForAllRebalanceAssets();

    const callbacks = this.subscribedTopicsCallbacks.get(topic);
    if (callbacks && callbacks.length > 0) {
      this.subscribedTopicsCallbacks.set(topic, [...callbacks, onMessage]);
    } else {
      this.subscribedTopicsCallbacks.set(topic, [onMessage]);
    }
  }

  /** Start Kafka Consumer for multiple topics */
  async startConsumerForAllRebalanceAssets() {
    if (!this.checkIfKafkaConnected()) return;
    // Ensure consumer is running only once
    if (this.consumerRunning !== "stopped") return;

    this.consumerRunning = "starting";

    const assetSymbols = await RebalanceDataManager.getRebalanceAssets();
    const topics = assetSymbols.map(({ id }) => `binance_orderbook_${id}`);

    await Promise.all(
      topics.map((topic) =>
        this.consumer.subscribe({ topic, fromBeginning: true })
      )
    );

    await this.consumer.run({
      eachMessage: async ({
        topic,
        message,
      }: {
        topic: string;
        message: any;
      }) => {
        try {
          if (!message?.value) return;
          const parsedMessage = JSON.parse(
            Buffer.from(message.value).toString("utf-8")
          );
          this.subscribedTopicsCallbacks
            .get(topic)
            ?.forEach((callback) => callback(parsedMessage, topic));
        } catch (error) {
          console.error(`Error processing message for topic ${topic}:`, error);
        }
      },
    });

    this.consumerRunning = "running";
  }

  private checkIfKafkaConnected() {
    if (
      this.kafka === null ||
      this.producer === null ||
      this.consumer === null
    ) {
      return false;
    }
    return true;
  }
}

const kafkaService = new KafkaService();

export default kafkaService;

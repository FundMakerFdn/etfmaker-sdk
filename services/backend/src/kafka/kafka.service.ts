import fastifyKafkaJS from "fastify-kafkajs";
import { Producer, Partitioners, logLevel } from "kafkajs";
import { sleep } from "../helpers/sleep";
import { DataProcessingService } from "../coindata/data-processing.service";

const KAFKA_URL = process.env.KAFKA_URL ?? "localhost:9092";

const dataProcessingService = new DataProcessingService();

export class KafkaService {
  private kafka: any = null;
  private producer: Producer | null = null;
  private consumer: any = null;

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
        logLevel: logLevel.ERROR,
        clientConfig: {
          brokers: [KAFKA_URL],
          clientId: "fund_maker_sdk",
        },
        producerConfig: {
          createPartitioner: Partitioners.DefaultPartitioner,
          allowAutoTopicCreation: true,
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
      sessionTimeout: 90000,
      heartbeatInterval: 30000,
      retry: {
        retries: 50,
      },
    });
    await this.consumer.connect();
    console.log("Kafka Service Connected ✅");
  }

  /** Send message to a Kafka topic */
  async sendMessage(topic: string, message: object) {
    if (this.consumerRunning === "stopped") {
      try {
        await this.startConsumerForAllRebalanceAssets();
      } catch (error) {}
      return;
    }

    if (!this.checkIfKafkaConnected() || this.consumerRunning !== "running")
      return;

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

    const assets = await dataProcessingService.getAllSpotUsdtPairs();
    const topics = assets.map(({ id }) => `binance_orderbook_${id}`);

    // Ensure topics exist before subscribing
    const admin = this.kafka.client.admin();
    await admin.connect();

    // await this.deleteAllTopics();

    await admin.createTopics({
      topics: topics.map((topic) => ({
        topic,
        numPartitions: 1,
        replicationFactor: 1,
      })),
    });

    await admin.disconnect();

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

  private async deleteAllTopics() {
    try {
      // Ensure topics exist before subscribing
      const admin = this.kafka.client.admin();
      await admin.connect();
      const topics = await admin.listTopics();

      if (topics.length === 0) {
        console.log("No topics found.");
        return;
      }

      await admin.deleteTopics({ topics });
      await admin.disconnect();
    } catch (error) {}
  }
}

const kafkaService = new KafkaService();

export default kafkaService;

import fastifyKafkaJS from "fastify-kafkajs";
import { Producer, Partitioners } from "kafkajs";
import { sleep } from "../helpers/sleep";

const KAFKA_URL = process.env.KAFKA_URL ?? "localhost:9092";

export class KafkaService {
  private kafka: any = null;
  private producer: Producer | null = null;
  private consumer: any = null;
  private readonly createdTopics: Map<string, Array<(data: any) => void>> =
    new Map();

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
  async startConsumer(topic: string, onMessage: (message: any) => void) {
    if (!this.checkIfKafkaConnected()) return;
    const callbacks = this.createdTopics.get(topic);
    if (callbacks && callbacks?.length > 0) {
      this.createdTopics.set(topic, [...callbacks, onMessage]);
      return;
    } else {
      this.createdTopics.set(topic, [onMessage]);
    }

    await this.consumer.stop();
    await this.consumer.subscribe({ topic, fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ message }: { message: any }) => {
        if (!message?.value) return;

        const parsedMessage = JSON.parse(
          Buffer.from(message.value).toString("utf-8")
        );

        this.createdTopics.forEach((onMessageCallbacks, key) => {
          if (key === topic) {
            onMessageCallbacks.forEach((onMessage) => onMessage(parsedMessage));
          }
        });
      },
    });
  }

  async disconnectConcumers() {
    if (!this.checkIfKafkaConnected()) return;
    await this.consumer!.stop();
  }

  /** Disconnect all consumers and producer */
  async disconnect() {
    if (!this.checkIfKafkaConnected()) return;

    await this.producer!.disconnect();
    await this.consumer!.disconnect();
    console.log("Kafka Service Disconnected ✅");
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

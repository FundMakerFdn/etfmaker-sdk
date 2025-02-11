import { Kafka, Producer, Consumer } from "kafkajs";
import WebSocket from "ws";

const KAFKA_URL = process.env.KAFKA_URL ?? "localhost:9092";

export class KafkaService {
  private readonly kafka: Kafka;
  private readonly producer: Producer;
  private consumers: Record<string, Consumer> = {};

  constructor(brokers: string[] = [KAFKA_URL]) {
    this.kafka = new Kafka({ brokers });
    this.producer = this.kafka.producer();
  }

  /** Connect Kafka Producer */
  async connectProducer() {
    await this.producer.connect();
    console.log("Kafka Producer Connected ✅");
  }

  /** Send message to a Kafka topic */
  async sendMessage(topic: string, message: object) {
    await this.producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
  }

  /** Start Kafka Consumer for a given topic */
  async startConsumer(
    topic: string,
    groupId: string,
    onMessage: (message: any) => void
  ) {
    if (this.consumers[topic]) return;

    const consumer = this.kafka.consumer({ groupId });
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ message }) => {
        if (!message?.value) return;

        const parsedMessage = JSON.parse(message.value.toString());
        onMessage(parsedMessage);
      },
    });

    this.consumers[topic] = consumer;
    console.log(`🎧 Listening for messages on topic: ${topic}`);
  }

  /** Disconnect all consumers and producer */
  async disconnect() {
    await this.producer.disconnect();
    for (const topic in this.consumers) {
      await this.consumers[topic].disconnect();
    }
    console.log("Kafka Service Disconnected ✅");
  }
}

const kafkaService = new KafkaService();

export default kafkaService;

import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import { OrderbookRoutes } from "./routes/orderbook";
import orderBookProducerService from "./orderbook/orderbook.producer.service";
import kafkaService from "./kafka/kafka.service";
import fastifyWebsocket from "@fastify/websocket";

const APP_HOST = process.env.APP_HOST ?? "0.0.0.0";
const APP_PORT = process.env.APP_PORT
  ? Number(process.env.ORDERBOOK_PORT)
  : 3005;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";

const bootstrap = async () => {
  const logger = IS_PRODUCTION
    ? true
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      };

  const fastify = Fastify({
    logger,
  });

  //Temporary fix for CORS issue
  if (IS_PRODUCTION) {
    fastify.register(fastifyCors, {
      origin: FRONTEND_URL,
      methods: ["GET"],
      allowedHeaders: ["Content-Type"],
    });
  } else {
    fastify.register(fastifyCors, {
      origin: "*",
      methods: ["GET"],
      allowedHeaders: ["Content-Type"],
    });
  }

  // Register the websocket plugin
  await fastify.register(fastifyWebsocket);

  try {
    OrderbookRoutes.forEach((route) => fastify.route(route));

    console.log("Registered Routes:");
    console.log(fastify.printRoutes({ commonPrefix: false }));

    // Connect Kafka producer
    await kafkaService.connectKafka(fastify);
    // Run stream order book Binance wss to kafka
    await orderBookProducerService.openStreamOrderBook();

    await fastify.listen({ port: APP_PORT, host: APP_HOST });
    fastify.log.info(`Server is running at http://${APP_HOST}:${APP_PORT}`);
  } catch (err) {
    fastify.log.error("Error starting Fastify server:", err);
    process.exit(1);
  }
};

bootstrap();

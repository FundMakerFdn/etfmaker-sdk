import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import { CoinGeckoRoutes } from "./routes/coingecko";
import { CoinDataRoutes } from "./routes/coindata";
import { ProcessingStatusService } from "./processing-status/processing-status.service";

const APP_HOST = process.env.APP_HOST ?? "0.0.0.0";
const APP_PORT = process.env.APP_PORT ? Number(process.env.APP_PORT) : 3001;
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

  try {
    CoinGeckoRoutes.forEach((route) => fastify.route(route));
    CoinDataRoutes.forEach((route) => fastify.route(route));

    // Fail all processing statuses on server start
    await ProcessingStatusService.failAll();

    await fastify.listen({ port: APP_PORT, host: APP_HOST });
    fastify.log.info(`Server is running at http://${APP_HOST}:${APP_PORT}`);
  } catch (err) {
    fastify.log.error("Error starting Fastify server:", err);
    process.exit(1);
  }
};

bootstrap();

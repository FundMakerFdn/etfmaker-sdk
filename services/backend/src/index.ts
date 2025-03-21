import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import { CoinGeckoRoutes } from "./routes/coingecko";
import { CoinDataRoutes } from "./routes/coindata";
import { ProcessingStatusService } from "./processing-status/processing-status.service";
import fastifyWebsocket from "@fastify/websocket";
import fastifySchedulePlugin from "@fastify/schedule";
import { CoinDataActualizationCronJob } from "./actualization/actualization.cron.service";
import { ActualizationRoutes } from "./routes/actualization";
import { RebalanceRoutes } from "./routes/rebalance";
import { IndexPriceRoutes } from "./routes/index-price";

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

  // Register the schedule plugin
  await fastify.register(fastifySchedulePlugin);

  // Register the websocket plugin
  await fastify.register(fastifyWebsocket);

  try {
    CoinGeckoRoutes.forEach((route) => fastify.route(route));
    CoinDataRoutes.forEach((route) => fastify.route(route));
    ActualizationRoutes.forEach((route) => fastify.route(route));
    RebalanceRoutes.forEach((route) => fastify.route(route));
    IndexPriceRoutes.forEach((route) => fastify.route(route));

    fastify.get("/health", (_request, reply) => {
      const healthcheck = {
        uptime: process.uptime(),
        message: "OK",
        timestamp: Date.now(),
      };
      try {
        reply.send(healthcheck);
      } catch (error) {
        healthcheck.message = error as string;
        reply.status(503).send();
      }
    });

    console.log("Registered Routes:");
    console.log(fastify.printRoutes({ commonPrefix: false }));

    // Fail all processing statuses on server start
    await ProcessingStatusService.failAll();

    await fastify.listen({ port: APP_PORT, host: APP_HOST });
    fastify.log.info(`Server is running at http://${APP_HOST}:${APP_PORT}`);

    fastify.ready(() => {
      fastify.scheduler.addCronJob(CoinDataActualizationCronJob);
    });
  } catch (err) {
    fastify.log.error("Error starting Fastify server:", err);
    process.exit(1);
  }
};

bootstrap();

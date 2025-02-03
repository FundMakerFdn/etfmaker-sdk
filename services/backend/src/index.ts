import Fastify from "fastify";
import { CoinGeckoRoutes } from "./routes/coingecko";
import { CoinDataRoutes } from "./routes/coindata";

const APP_HOST = process.env.APP_HOST ?? "0.0.0.0";
const APP_PORT = process.env.APP_PORT ? Number(process.env.APP_PORT) : 3001;
const IS_PRODUCTION = process.env.ENV === "production";

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

  try {
    CoinGeckoRoutes.forEach((route) => fastify.route(route));
    CoinDataRoutes.forEach((route) => fastify.route(route));

    await fastify.listen({ port: APP_PORT, host: APP_HOST });
    fastify.log.info(`Server is running at http://${APP_HOST}:${APP_PORT}`);
  } catch (err) {
    fastify.log.error("Error starting Fastify server:", err);
    process.exit(1);
  }
};

bootstrap();

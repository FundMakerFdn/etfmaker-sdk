import { HTTPMethods } from "fastify";
export interface RoutesType {
  method: HTTPMethods;
  url: string;
  preHandler?: Function;
  handler: Function;
  websocket?: boolean;
  wsHandler?: Function;
}

import { OhclGroupByEnum } from "../../enums/OhclGroupBy.enum";
import { RebalanceConfig } from "../../interfaces/RebalanceConfig.interface";
import WebSocket from "ws";

export interface OhclChartDataType {
  time: number;
  open: string;
  high: string;
  low: string;
  close: string;
}

export interface GetOhclChartDataInput {
  etfId: RebalanceConfig["etfId"];
  groupBy: OhclGroupByEnum;
  from: string;
  to: string;
}

export interface EtfPriceSetClientInput {
  socket: WebSocket;
  startTimestamp: number;
  etfId: RebalanceConfig["etfId"];
  groupBy: OhclGroupByEnum;
}

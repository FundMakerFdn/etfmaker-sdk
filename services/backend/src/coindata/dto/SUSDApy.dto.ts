import { RebalanceConfig } from "../../interfaces/RebalanceConfig.interface";

export interface SUSDApyReturnDto {
  time: number;
  value: number;
  etfId: RebalanceConfig["etfId"];
}

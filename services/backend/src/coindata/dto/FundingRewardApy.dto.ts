import { RebalanceConfig } from "../../interfaces/RebalanceConfig.interface";

export interface FundingRewardApyReturnDto {
  time: number;
  value: number;
  etfId: RebalanceConfig["etfId"];
}

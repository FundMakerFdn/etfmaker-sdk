import { RebalanceConfig } from "../../interfaces/RebalanceConfig.interface";

export interface FundingRewardApyReturnDto {
  time: Date;
  value: number;
  etfId: RebalanceConfig["etfId"];
}

import { RebalanceConfig } from "../../interfaces/RebalanceConfig.interface";

export const etfIdTypeCheck = (id: any): id is RebalanceConfig["etfId"] => {
  if (typeof id !== "string") {
    return false;
  }
  const regex = /^top\d+Index(?:Yearly|Monthly|Weekly|Daily|Hourly)\w+$/;
  return regex.test(id);
};

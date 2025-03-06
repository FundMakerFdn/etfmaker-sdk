import { RebalanceConfig } from "../interfaces/RebalanceConfig.interface";
import { etfIdTypeCheck } from "./typecheck/etfIdTypeCheck";

export const validateEtfIndexConfig = (
  config: RebalanceConfig
): { valid: boolean; message: string; example: Record<string, any> } => {
  const invalidFields: string[] = [];
  if (!config.etfId || !etfIdTypeCheck(config.etfId)) {
    invalidFields.push("etfId");
  }

  if (!config.initialPrice || typeof config.initialPrice !== "number") {
    invalidFields.push("initialPrice");
  }

  if (
    !config.startDate ||
    new Date(config.startDate).toString() === "Invalid Date"
  ) {
    invalidFields.push("startDate");
  }

  if (config.category && typeof config.category !== "string") {
    invalidFields.push("category");
  }

  return {
    valid: invalidFields.length === 0,
    message: `Invalid fields: ${invalidFields.join(", ")}`,
    example: {
      etfId: "top20IndexHourly",
      startDate: 1735290283000,
      initialPrice: 100,
      category: "ai-meme-coins",
    },
  };
};

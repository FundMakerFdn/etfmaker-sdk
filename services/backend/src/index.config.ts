import { RebalanceConfig } from "./interfaces/RebalanceConfig.interface";
export const indexDefaultConfig = {
  etfId: "top20IndexHourly",
  startDate: new Date(1735290283000),
  initialPrice: 100,
  // category: "ai-meme-coins",
} satisfies RebalanceConfig;

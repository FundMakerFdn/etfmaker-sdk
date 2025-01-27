import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const CoinGeckoTopTable = pgTable("coin_gecko_top", {
  id: serial("id").primaryKey(),
  name: text("name"),
  symbol: text("symbol"),
  assetId: text("asset_id"),
});

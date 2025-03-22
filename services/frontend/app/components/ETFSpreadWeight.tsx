import { useWebsocket } from "app/hooks/useWebsocket";
import { memo } from "react";
import GlobalConfig from "../app.config";

const NEXT_PUBLIC_ORDERBOOK_SERVER_WEBSOCKET_URL =
  GlobalConfig.NEXT_PUBLIC_ORDERBOOK_SERVER_WEBSOCKET_URL;

export const EtfSpreadWeight = memo(() => {
  const data = useWebsocket<{ averageWeightedSpread: number }>({
    url: NEXT_PUBLIC_ORDERBOOK_SERVER_WEBSOCKET_URL + "/etf-weighted-spread",
    dataChange: "replace",
  });

  return <div>ETF weighted spread: {data?.averageWeightedSpread ?? ""}%</div>;
});

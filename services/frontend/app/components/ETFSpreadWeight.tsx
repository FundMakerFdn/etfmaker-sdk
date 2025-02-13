import { useWebsocket } from "app/hooks/useWebsocket";
import { memo } from "react";

export const EtfSpreadWeight = memo(() => {
  const { averageWeightedSpread } = useWebsocket(
    "/etf-weighted-spread",
    "replace"
  );

  return <div>ETF weighted spread: {averageWeightedSpread ?? ""}%</div>;
});

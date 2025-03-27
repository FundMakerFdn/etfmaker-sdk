"use client";

import { useEffect, useState } from "react";
import { FiltersByAllSpotUSDTPairsAssets } from "app/components/Filters";
import { useWebsocket } from "app/hooks/useWebsocket";
import { ChartDataType } from "app/types/ChartDataType";
import { SingleLineChart } from "app/components/charts/SindleLineChart";
import GlobalConfig from "../app.config";
import { groupByTime } from "app/helpers/groupByTime";

const NEXT_PUBLIC_ORDERBOOK_SERVER_WEBSOCKET_URL =
  GlobalConfig.NEXT_PUBLIC_ORDERBOOK_SERVER_WEBSOCKET_URL;

export default function Page() {
  const [filter, setFilter] = useState<number>();
  const [spreadDepthPercentage, setSpreadDepthPercentage] = useState<number>();
  const [spreadData, setSpreadData] = useState<ChartDataType[]>([]);
  const [bidDepthData, setBidDepthData] = useState<ChartDataType[]>([]);
  const [askDepthData, setAskDepthData] = useState<ChartDataType[]>([]);

  const data = useWebsocket<
    {
      time: string;
      spread: string;
      bidDepth: string;
      askDepth: string;
      spreadDepthPercentage: string;
    }[]
  >({
    url: NEXT_PUBLIC_ORDERBOOK_SERVER_WEBSOCKET_URL + "/order-book",
    dataChange: "unshift",
    params: { coinId: filter },
  });

  useEffect(() => {
    if (!data) return;

    const spread = data.map((d) => ({
      value: d.spread,
      time: d.time,
    }));
    const bidDepth = data.map((d) => ({
      value: d.bidDepth,
      time: d.time,
    }));
    const askDepth = data.map((d) => ({
      value: d.askDepth,
      time: d.time,
    }));

    setSpreadDepthPercentage(+data[data.length - 1]?.spreadDepthPercentage);
    setSpreadData(groupByTime(spread));
    setBidDepthData(groupByTime(bidDepth));
    setAskDepthData(groupByTime(askDepth));
  }, [data?.length]);

  return (
    <div>
      <h1>Market Data Charts</h1>
      <FiltersByAllSpotUSDTPairsAssets
        value={filter}
        setFilterToProcess={setFilter}
      />
      <h3>
        Spread depth percentage:{" "}
        {!isNaN(spreadDepthPercentage) && spreadDepthPercentage}%
      </h3>

      <h2>Spread</h2>
      <SingleLineChart data={spreadData} />
      <h2>Bid Depth</h2>
      <SingleLineChart data={bidDepthData} />
      <h2>Ask Depth</h2>
      <SingleLineChart data={askDepthData} />
    </div>
  );
}

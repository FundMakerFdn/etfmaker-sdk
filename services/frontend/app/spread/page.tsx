"use client";

import { useEffect, useState } from "react";
import { FiltersByAssets } from "app/components/Filters";
import { useWebsocket } from "app/hooks/useWebsocket";
import { ChartDataType } from "app/types/ChartDataType";
import { CoinType } from "app/types/CoinType";
import { SingleLineChart } from "app/components/SindleLineChart";

const SERVER_URL = process.env.SERVER_URL;

const groupByTime = (data: any): any => {
  const groupedData = Object.groupBy(data, ({ time }) => time);

  const result = [];

  for (const [time, dataArray] of Object.entries(groupedData)) {
    if (dataArray.length > 1) {
      const spreadValue =
        (dataArray.reduce(
          (acc: number, { value }: { value: string }) => acc + +value,
          0
        ) as number) / dataArray.length;
      result.push({ time: Number(time), value: spreadValue });
    } else {
      result.push(dataArray[0]);
    }
  }

  return result;
};

export default function Page() {
  const [availableAssetsToFilter, setAvailableAssetsToFilter] = useState<
    CoinType[]
  >([]);
  const [filter, setFilter] = useState<string>("");
  const [spreadData, setSpreadData] = useState<ChartDataType[]>([]);
  const [bidDepthData, setBidDepthData] = useState<ChartDataType[]>([]);
  const [askDepthData, setAskDepthData] = useState<ChartDataType[]>([]);

  const data = useWebsocket(filter ? `/order-book?symbol=${filter}` : "");

  useEffect(() => {
    const getData = async () => {
      const response = await fetch(`${SERVER_URL}/get-rebalance-assets`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();
      if (result?.data.length > 0) {
        setAvailableAssetsToFilter(result.data);
      }
    };
    getData();
  }, []);

  useEffect(() => {
    if (data && data.length > 0) {
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

      setSpreadData(groupByTime(spread));
      setBidDepthData(groupByTime(bidDepth));
      setAskDepthData(groupByTime(askDepth));
    }
  }, [data]);

  return (
    <div>
      <h1>Market Data Charts</h1>
      <FiltersByAssets
        availableAssets={availableAssetsToFilter}
        value={filter}
        setFilterToProcess={setFilter}
        byValue="symbol"
      />
      <h2>Spread</h2>
      <SingleLineChart data={spreadData} />
      <h2>Bid Depth</h2>
      <SingleLineChart data={bidDepthData} />
      <h2>Ask Depth</h2>
      <SingleLineChart data={askDepthData} />
    </div>
  );
}

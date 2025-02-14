"use client";

import { useEffect, useState } from "react";
import { FiltersByAssets } from "app/components/Filters";
import { useWebsocket } from "app/hooks/useWebsocket";
import { ChartDataType } from "app/types/ChartDataType";
import { CoinType } from "app/types/CoinType";
import { SingleLineChart } from "app/components/SindleLineChart";
import { EtfSpreadWeight } from "app/components/ETFSpreadWeight";

const NEXT_PUBLIC_SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;

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
      const item = dataArray[0] as { time: string; value: string };
      result.push({
        time: Number(item.time),
        value: item.value,
      });
    }
  }

  return result;
};

export default function Page() {
  const [availableAssetsToFilter, setAvailableAssetsToFilter] = useState<
    CoinType[]
  >([]);
  const [filter, setFilter] = useState<number>();
  const [spreadDepthPercentage, setSpreadDepthPercentage] = useState<number>();
  const [spreadData, setSpreadData] = useState<ChartDataType[]>([]);
  const [bidDepthData, setBidDepthData] = useState<ChartDataType[]>([]);
  const [askDepthData, setAskDepthData] = useState<ChartDataType[]>([]);

  const data = useWebsocket("/order-book", "unshift", { coinId: filter });

  useEffect(() => {
    const getData = async () => {
      const rebalanceAssets = await fetch(
        `${NEXT_PUBLIC_SERVER_URL}/get-rebalance-assets`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      ).then((res) => res.json());

      if (rebalanceAssets?.data.length > 0) {
        setAvailableAssetsToFilter(rebalanceAssets.data);
        setFilter(rebalanceAssets.data[0].id);
      }
    };
    getData();
  }, []);

  useEffect(() => {
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
  }, [data.length]);

  return (
    <div>
      <h1>Market Data Charts</h1>
      <FiltersByAssets
        availableAssets={availableAssetsToFilter}
        value={filter}
        setFilterToProcess={setFilter}
      />
      <h3>
        Spread depth percentage:{" "}
        {!isNaN(spreadDepthPercentage) && spreadDepthPercentage}%
      </h3>

      <EtfSpreadWeight />

      <h2>Spread</h2>
      <SingleLineChart data={spreadData} />
      <h2>Bid Depth</h2>
      <SingleLineChart data={bidDepthData} />
      <h2>Ask Depth</h2>
      <SingleLineChart data={askDepthData} />
    </div>
  );
}

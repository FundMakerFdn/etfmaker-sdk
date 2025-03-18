"use client";

import React, { useState, useEffect } from "react";
import {
  ChartCanvas,
  Chart,
  CandlestickSeries,
  XAxis,
  YAxis,
  CrossHairCursor,
  MouseCoordinateX,
  MouseCoordinateY,
  OHLCTooltip,
  discontinuousTimeScaleProvider,
} from "react-financial-charts";
import { getOHCLDataInfo } from "app/data/getOHCLDataInfo";
import { GroupByOptions } from "../Filters";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "app/shadcn/components/ui/card";
import { OhclGroupByEnum } from "app/enums/OhclGroupBy.enum";

export interface OHLCData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface ChartProps {
  coinId: number;
  category: string;
  loaded?: () => void;
}

export const TradingWidgetChart: React.FC<ChartProps> = ({
  coinId,
  category,
  loaded,
}) => {
  const [data, setData] = useState<OHLCData[]>([]);
  const [groupBy, setGroupBy] = useState<string>(OhclGroupByEnum["1m"]);

  const xScaleProvider = discontinuousTimeScaleProvider.inputDateAccessor(
    (d: OHLCData) => d.date
  );
  const {
    data: chartData,
    xScale,
    xAccessor,
    displayXAccessor,
  } = xScaleProvider(data);

  useEffect(() => {
    const fetchData = async () => {
      const now = Math.floor(Date.now());
      const from = now - 30 * 24 * 60 * 60 * 1000; // 30 days ago in seconds
      const to = now;
      const fetchedData = await getOHCLDataInfo({
        from: from.toString(),
        to: to.toString(),
        coinId,
        category,
        groupBy,
      });
      setData(fetchedData.map((d) => ({ ...d, date: new Date(d.date) })));
      loaded && loaded();
    };
    fetchData();
  }, [coinId, category, groupBy]);

  if (!data.length) {
    return <>Loading ...</>;
  }

  const handleLoadMore = async (start: number, end: number) => {
    const from =
      (data[1].date.getTime() - data[0].date.getTime()) * start +
      data[0].date.getTime();
    const to =
      data[data.length - 1].date.getTime() - (data[0].date.getTime() - from);

    if (data.length && from < data[0].date.getTime()) {
      const newData = await getOHCLDataInfo({
        from: from.toString(),
        to: to.toString(),
        coinId,
        category,
        groupBy,
      });

      setData((prevData) => {
        const combined = [...newData, ...prevData];
        const unique = combined.reduce((acc: OHLCData[], cur) => {
          const currDate = new Date(cur.date);
          if (!acc.find((d) => d.date.getTime() === currDate.getTime())) {
            acc.push({ ...cur, date: currDate });
          }
          return acc;
        }, [] as OHLCData[]);
        unique.sort((a, b) => a.date.getTime() - b.date.getTime());
        return unique;
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Index OHLC Chart</CardTitle>
        </div>
        <GroupByOptions onSelect={setGroupBy} />
      </CardHeader>

      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartCanvas
          height={400}
          width={window.innerWidth - 100}
          ratio={3}
          margin={{ left: 50, right: 50, top: 10, bottom: 30 }}
          seriesName="OHLC"
          data={chartData}
          xScale={xScale}
          xAccessor={xAccessor}
          displayXAccessor={displayXAccessor}
          onLoadBefore={(from: number, to: number) => handleLoadMore(from, to)}
        >
          <Chart id={1} yExtents={(d: OHLCData) => [d.high, d.low]}>
            <XAxis />
            <YAxis />
            <CandlestickSeries />
            <MouseCoordinateX displayFormat={(item: any) => item} />
            <MouseCoordinateY displayFormat={(item: any) => item} />
            <OHLCTooltip origin={[-40, 0]} />
          </Chart>
          <CrossHairCursor />
        </ChartCanvas>
      </CardContent>
    </Card>
  );
};

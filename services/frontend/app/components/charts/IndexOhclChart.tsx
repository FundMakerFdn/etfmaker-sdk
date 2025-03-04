"use client";

import { getOHCLDataInfo } from "app/data/getOHCLDataInfo";
import { OhclChartDataType } from "app/types/OhclChartDataType";
import { CandlestickSeries, ColorType, createChart } from "lightweight-charts";
import { useRef, useEffect, FC, useState } from "react";

export const IndexOhclChart: FC<{
  coinId: number;
  category: string;
  loaded?: () => void;
}> = ({ coinId, category, loaded }) => {
  const [ohclData, setOhclData] = useState<OhclChartDataType[]>([]);
  const [timeRange, setTimeRange] = useState<"all" | "week" | "month" | "year">(
    "week"
  );
  const ohclChartRef = useRef(null);
  const chartInstanceRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);

  useEffect(() => {
    const getOhclData = async () => {
      const data = await getOHCLDataInfo(timeRange, coinId, category);
      setOhclData(data);
      loaded && loaded();
    };
    getOhclData();
  }, [coinId, category, loaded, timeRange]);

  useEffect(() => {
    if (!ohclChartRef.current) return;

    const ohclChart = createChart(ohclChartRef.current, {
      width: ohclChartRef.current.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: "#fff" },
        textColor: "#333",
      },
      grid: {
        vertLines: { color: "#eee" },
        horzLines: { color: "#eee" },
      },
      rightPriceScale: {
        borderColor: "#ccc",
      },
      timeScale: {
        borderColor: "#ccc",
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: number) => {
          const date = new Date(time * 1000);
          return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
        },
      },
    });

    chartInstanceRef.current = ohclChart;

    const candlestickSeries = ohclChart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    candlestickSeriesRef.current = candlestickSeries;

    candlestickSeries.setData(
      ohclData.map((item) => ({
        time: item.time,
        open: +item.open,
        high: +item.high,
        low: +item.low,
        close: +item.close,
      }))
    );

    ohclChart.timeScale().fitContent();

    return () => {
      ohclChart.remove();
    };
  }, [ohclData.length]);

  return (
    <div>
      <h1>Index OHLC Chart</h1>
      <div className="mb-4 flex gap-2">
        <button className="border-1 p-1" onClick={() => setTimeRange("week")}>
          Last Week
        </button>
        <button className="border-1 p-1" onClick={() => setTimeRange("month")}>
          Last Month
        </button>
        <button className="border-1 p-1" onClick={() => setTimeRange("year")}>
          Last Year
        </button>
        <button className="border-1 p-1" onClick={() => setTimeRange("all")}>
          All Data
        </button>
      </div>
      <div
        ref={ohclChartRef}
        style={{ position: "relative", height: "400px" }}
      />
    </div>
  );
};

"use client";

import { getOHCLDataInfo } from "app/data/getOHCLDataInfo";
import { OhclChartDataType } from "app/types/OhclChartDataType";
import { CandlestickSeries, ColorType, createChart } from "lightweight-charts";
import { useRef, useEffect, FC, useState, useMemo } from "react";
import debounce from "lodash/debounce";

const fetchtOhclData = (
  setOhclData: (data: OhclChartDataType[]) => void,
  setIsLoading: (isLoading: boolean) => void,
  coinId: number,
  category: string
) => {
  return async (isLoading: boolean, from?: string, to?: string) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const data = await getOHCLDataInfo(from, to, coinId, category);
      setOhclData(data);
    } catch (error) {
      console.error(error);
    }
    setIsLoading(false);
  };
};

export const IndexOhclChart: FC<{
  coinId: number;
  category: string;
  loaded?: () => void;
}> = ({ coinId, category, loaded }) => {
  const [ohclData, setOhclData] = useState<OhclChartDataType[]>([]);
  const ohclChartRef = useRef(null);
  const chartInstanceRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const getOhclData = useMemo(
    () => fetchtOhclData(setOhclData, setIsLoading, coinId, category),
    [coinId, category, setOhclData, setIsLoading]
  );

  useEffect(() => {
    getOhclData(isLoading);
  }, [coinId, category, loaded]);

  useEffect(() => {
    if (!ohclChartRef.current) return;

    if (!chartInstanceRef.current) {
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
      ohclChart.timeScale().fitContent();
    }

    candlestickSeriesRef.current.setData(
      ohclData.map((item) => ({
        time: item.time,
        open: +item.open,
        high: +item.high,
        low: +item.low,
        close: +item.close,
      }))
    );

    const prevRange = {
      from: +ohclData[0]?.time,
      to: +ohclData[ohclData.length - 1]?.time,
    };
    let defaultRange = prevRange.to - prevRange.from;

    const chartTimeRangeChangeHandler = debounce((newVisibleRange) => {
      if (!newVisibleRange) return;

      const newRange = { from: prevRange.from, to: prevRange.to };

      // If the user scrolls to the left (earlier time)
      if (newVisibleRange.from < prevRange.from) {
        newRange.from = newVisibleRange.from - defaultRange * 0.1; // Expand the range by 10%
      }

      // If the user scrolls to the right (later time)
      if (newVisibleRange.to > prevRange.to) {
        newRange.to = newVisibleRange.to + defaultRange * 0.1; // Expand the range by 10%
      }

      // Ensure the range doesn't shrink below the default range
      if (newRange.to - newRange.from < defaultRange) {
        newRange.from = newRange.to - defaultRange;
      }

      // Update the previous range
      prevRange.from = newRange.from;
      prevRange.to = newRange.to;

      // Fetch new data based on the expanded range
      getOhclData(isLoading, newRange.from.toString(), newRange.to.toString());
    }, 500);

    chartInstanceRef.current
      ?.timeScale()
      .subscribeVisibleTimeRangeChange(chartTimeRangeChangeHandler);

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current
          ?.timeScale()
          .unsubscribeVisibleTimeRangeChange(chartTimeRangeChangeHandler);
      }
    };
  }, [ohclData.length]);

  return (
    <div>
      <h1>Index OHLC Chart</h1>
      {isLoading && <div>Loading...</div>}
      <div
        ref={ohclChartRef}
        style={{ position: "relative", height: "400px" }}
      />
    </div>
  );
};

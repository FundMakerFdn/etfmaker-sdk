"use client";

import { OhclChartDataType } from "app/types/OhclChartDataType";
import { CandlestickSeries, ColorType, createChart } from "lightweight-charts";
import { useRef, useEffect, FC } from "react";

export const IndexOhclChart: FC<{ data: OhclChartDataType[] }> = (props) => {
  const ohclData = props.data;

  const ohclChartRef = useRef(null);

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
      },
    });

    const candlestickSeries = ohclChart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

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
  }, [ohclData]);

  return (
    <div>
      <h1>Index OHLC Chart</h1>
      <div
        ref={ohclChartRef}
        style={{ position: "relative", height: "400px" }}
      />
    </div>
  );
};

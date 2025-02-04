"use client";

import {
  CandlestickSeries,
  ColorType,
  createChart,
  LineSeries,
} from "lightweight-charts";
import moment from "moment";
import { useRef, useEffect } from "react";

export const ChartOHCL = ({ chartData, APY }) => {
  const { data: historicData } = chartData;

  const ohclChartRef = useRef(null);
  const apyChartRef = useRef(null);

  useEffect(() => {
    if (!ohclChartRef.current || !apyChartRef.current) return;

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

    const ohclData = historicData.slice(0, 10).map((item) => ({
      time: moment(item.timestamp).unix(),
      open: +item.open,
      high: +item.high,
      low: +item.low,
      close: +item.close,
    }));

    candlestickSeries.setData(ohclData);
    ohclChart.timeScale().fitContent();

    const chartOptions = {
      layout: {
        textColor: "black",
        background: { type: ColorType.Solid, color: "white" },
      },
    };
    const lineChart = createChart(apyChartRef.current, chartOptions);
    const lineSeries = lineChart.addSeries(LineSeries, { color: "#2962FF" });

    const lineChartData = APY.data.map((item) => ({
      time: moment(item.timestamp).unix(),
      value: +item.cumulativeApy,
    }));

    lineSeries.setData(lineChartData);

    ohclChart.timeScale().fitContent();

    return () => {
      ohclChart.remove();
    };
  }, [historicData]);

  return (
    <div>
      <h1>Index OHLC Chart</h1>
      <div
        ref={ohclChartRef}
        style={{ position: "relative", height: "400px" }}
      />
      <h1>APY Chart of funding reward</h1>
      <div
        ref={apyChartRef}
        style={{ position: "relative", height: "400px" }}
      />
    </div>
  );
};

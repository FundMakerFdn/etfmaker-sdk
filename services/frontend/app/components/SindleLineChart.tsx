"use client";

import { ChartDataType } from "app/types/ChartDataType";
import { ColorType, createChart, LineSeries } from "lightweight-charts";
import { FC, useEffect, useRef } from "react";

export const SingleLineChart: FC<{
  data: ChartDataType[];
}> = (props) => {
  const apyData = props.data;

  const apyChartRef = useRef(null);

  useEffect(() => {
    if (!apyChartRef.current) return;
    const chartOptions = {
      layout: {
        textColor: "black",
        background: { type: ColorType.Solid, color: "white" },
      },
      timeScale: {
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
    };
    const apyChart = createChart(apyChartRef.current, chartOptions);
    const lineSeries = apyChart.addSeries(LineSeries, { color: "#2962FF" });

    lineSeries.setData(
      apyData.map((item) => ({ time: item.time, value: +item.value }))
    );

    apyChart.timeScale().fitContent();

    return () => {
      apyChart.remove();
    };
  }, [apyData, apyChartRef.current]);

  return (
    <div ref={apyChartRef} style={{ position: "relative", height: "400px" }} />
  );
};

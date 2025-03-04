"use client";

import { ChartDataType } from "app/types/ChartDataType";
import { ColorType, createChart, LineSeries, Time } from "lightweight-charts";
import { FC, memo, useEffect, useRef } from "react";

export const SingleLineChart: FC<{
  data: ChartDataType[];
}> = memo(
  (props) => {
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
          secondsVisible: true,
          tickMarkFormatter: (time: number) => {
            const date = new Date(time);
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
        apyData.map((item) => ({
          time: (new Date(item.time).valueOf() / 1000) as Time,
          value: +item.value,
        }))
      );

      apyChart.timeScale().fitContent();

      return () => {
        apyChart.remove();
      };
    }, [apyData.length, apyChartRef.current]);

    return (
      <div
        ref={apyChartRef}
        style={{ position: "relative", height: "400px" }}
      />
    );
  },
  (prevProps, nextProps) => {
    return prevProps.data.length === nextProps.data.length;
  }
);

"use client";

import { generateDistinctDarkColors } from "app/helpers/generateDistinctDarkColors";
import { ChartDataType } from "app/types/ChartDataType";
import { createChart, LineSeries } from "lightweight-charts";
import { FC, useEffect, useMemo, useRef } from "react";

export const MultilineChart: FC<{
  data: {
    [key: string]: ChartDataType[];
  };
}> = (props) => {
  const data = props.data;
  const chartRef = useRef(null);

  const colors = useMemo(
    () => generateDistinctDarkColors(Object.keys(data).length),
    [data]
  );

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    Object.values(data).forEach((dataArray: ChartDataType[], idx: number) => {
      const lineSeries = chart.addSeries(LineSeries, {
        color: colors[idx],
      });
      lineSeries.setData(dataArray);
    });

    return () => {
      chart.remove();
    };
  }, [data, chartRef.current]);

  return (
    <>
      <div ref={chartRef} style={{ position: "relative", height: "400px" }} />
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
        }}
      >
        {colors.map((color, idx) => (
          <div
            key={color}
            style={{ display: "flex", flex: "1 1 400px", maxWidth: "100%" }}
          >
            <span>{Object.keys(data)[idx]}</span>
            <div
              style={{
                backgroundColor: color,
                width: 30,
                height: "1rem",
                marginRight: 10,
                marginLeft: 5,
              }}
            />
          </div>
        ))}
      </div>
    </>
  );
};

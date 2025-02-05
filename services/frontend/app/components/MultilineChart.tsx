"use client";

import { ChartDataType } from "app/types/ChartDataType";
import { createChart, LineSeries } from "lightweight-charts";
import { FC, Fragment, useEffect, useMemo, useRef } from "react";

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
  }, [data]);

  return (
    <>
      <div ref={chartRef} style={{ position: "relative", height: "400px" }} />
      <div style={{ display: "flex" }}>
        {colors.map((color, idx) => (
          <Fragment key={color}>
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
          </Fragment>
        ))}
      </div>
    </>
  );
};

const generateDistinctDarkColors = (count: number): string[] => {
  const colors = [];
  const hueStep = 360 / count;
  const saturation = 100; // Full saturation for vivid colors
  const lightness = 50; // Low lightness for dark colors

  for (let i = 0; i < count; i++) {
    const hue = i * hueStep;
    const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    colors.push(color);
  }

  return colors;
};

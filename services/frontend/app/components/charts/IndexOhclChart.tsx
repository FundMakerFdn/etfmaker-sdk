"use client";

import { getOHCLDataInfo } from "app/data/getOHCLDataInfo";
import { OhclChartDataType } from "app/types/OhclChartDataType";
import { CandlestickSeries, ColorType, createChart } from "lightweight-charts";
import { useRef, useEffect, FC, useMemo, useState, useCallback } from "react";
import throttle from "lodash/throttle";
import {
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  Select,
} from "app/shadcn/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "app/shadcn/components/ui/card";

const fetchtOhclData = (coinId: number, category: string) => {
  let isLoading = false;
  return async (
    groupBy: string,
    from?: string,
    to?: string
  ): Promise<OhclChartDataType[]> => {
    if (isLoading) return;
    isLoading = true;
    try {
      const data = await getOHCLDataInfo(groupBy, from, to, coinId, category);
      isLoading = false;
      return data;
    } catch (error) {
      console.error(error);
    }
    isLoading = false;
  };
};

export const IndexOhclChart: FC<{
  coinId: number;
  category: string;
  loaded?: () => void;
}> = ({ coinId, category, loaded }) => {
  const ohclChartRef = useRef(null);
  const chartInstanceRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const [groupBy, setGroupBy] = useState<string>("minutes");
  const groupByRef = useRef<string>("minutes");
  groupByRef.current = groupBy;
  const currentRange = useRef<{ from: string; to: string }>(null!);

  const getOhclData = useMemo(
    () => fetchtOhclData(coinId, category),
    [coinId, category]
  );

  const chartTimeRangeChangeHandler = throttle(
    async (newVisibleRange, prevFrom, prevTo) => {
      if (!newVisibleRange) return;

      let defaultRange = prevTo - prevFrom;

      if (groupByRef.current === "day") {
        defaultRange = 24 * 60 * 60 * 30; // 30 days
      } else if (groupByRef.current === "week") {
        defaultRange = 24 * 60 * 60 * 7 * 30; // 30 weeks
      } else if (groupByRef.current === "month") {
        defaultRange = 24 * 60 * 60 * 30 * 30; // 30 months
      } else if (groupByRef.current === "year") {
        defaultRange = 24 * 60 * 60 * 30 * 12 * 5; // 5 years
      }

      if (currentRange.current) {
        prevFrom = currentRange.current.from;
        prevTo = currentRange.current.to;
      }

      const newRange = { from: prevFrom, to: prevTo };

      // If the user scrolls to the left (earlier time)
      if (+newVisibleRange.to < prevTo) {
        const scrollPercent =
          (prevTo - newVisibleRange.to) / defaultRange + 0.5;
        newRange.from =
          +newVisibleRange.from - Math.round(defaultRange * scrollPercent);
      }

      // If the user scrolls to the right (later time)
      if (+newVisibleRange.from > prevFrom) {
        const scrollPercent =
          (newVisibleRange.from - prevFrom) / defaultRange + 0.5;
        newRange.to =
          +newVisibleRange.to + Math.round(defaultRange * scrollPercent);
      }

      if (newRange.from < 0) {
        newRange.from = 0;
      }

      // Ensure the range doesn't shrink below the default range
      if (newRange.to - newRange.from < defaultRange) {
        newRange.from = +newRange.to - defaultRange;
      }

      // Fetch new data using the updated groupBy
      const data = await getOhclData(
        groupByRef.current,
        newRange.from.toString(),
        newRange.to.toString()
      );

      if (!data?.length) return;

      currentRange.current = newRange;

      candlestickSeriesRef.current.setData(
        data.map((item) => ({
          time: item.time,
          open: +item.open,
          high: +item.high,
          low: +item.low,
          close: +item.close,
        }))
      );
    },
    1000
  );

  useEffect(() => {
    if (!chartInstanceRef.current || !currentRange.current) return;

    updateChartdata();
  }, [groupBy]); // Rerun effect when groupBy changes

  const updateChartdata = useCallback(async () => {
    let from, to;
    if (currentRange.current) {
      from = currentRange.current.from;
      to = currentRange.current.to;
    }
    const data = await getOhclData(from, to);

    if (!data) return;

    candlestickSeriesRef.current.setData(
      data.map((item) => ({
        time: item.time,
        open: +item.open,
        high: +item.high,
        low: +item.low,
        close: +item.close,
      }))
    );

    return data;
  }, []);

  useEffect(() => {
    if (!ohclChartRef.current) return;

    let scrollHandler: any;

    const initChart = async () => {
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

      const data = await updateChartdata();

      currentRange.current = {
        from: data[0].time,
        to: data[data.length - 1].time,
      };

      scrollHandler = (newRange) =>
        chartTimeRangeChangeHandler(
          newRange,
          currentRange.current.from,
          currentRange.current.to
        );

      chartInstanceRef.current
        ?.timeScale()
        .subscribeVisibleTimeRangeChange(scrollHandler);
    };

    !chartInstanceRef.current && initChart();

    return () => {
      if (chartInstanceRef.current) {
        // chartInstanceRef.current
        //   ?.timeScale()
        //   .unsubscribeVisibleTimeRangeChange(scrollHandler);
      }
    };
  }, [coinId, category, loaded]);

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Index OHLC Chart</CardTitle>
        </div>

        <Select
          onValueChange={(value) => {
            setGroupBy(value);
            groupByRef.current = value;
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={groupBy ?? "minutes"} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Group by: </SelectLabel>
              <SelectItem value="minute">Minutes</SelectItem>
              <SelectItem value="day">Days</SelectItem>
              <SelectItem value="week">Weeks</SelectItem>
              <SelectItem value="month">Months</SelectItem>
              <SelectItem value="year">Years</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <div
          ref={ohclChartRef}
          style={{ position: "relative", height: "400px" }}
        />
      </CardContent>
    </Card>
  );
};

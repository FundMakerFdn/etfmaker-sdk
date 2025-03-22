"use client";

import { getOHCLDataInfo } from "app/data/getOHCLDataInfo";
import { OhclChartDataType } from "app/types/OhclChartDataType";
import { CandlestickSeries, ColorType, createChart } from "lightweight-charts";
import { useRef, useEffect, FC, useMemo, useCallback, useState } from "react";
import throttle from "lodash/throttle";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "app/shadcn/components/ui/card";
import { GroupByOptions } from "../Filters";
import { OhclGroupByEnum } from "app/enums/OhclGroupBy.enum";
import { RebalanceDto } from "app/types/RebalanceType";
import { useWebsocket } from "app/hooks/useWebsocket";
import GlobalConfig from "../../app.config";

const NEXT_PUBLIC_BACKEND_SERVER_WEBSOCKET_URL =
  GlobalConfig.NEXT_PUBLIC_BACKEND_SERVER_WEBSOCKET_URL;

// This helper returns a function that will fetch OHLC data for a given time range.
const fetchtOhclData = (
  coinId: number,
  category: string,
  etfId: RebalanceDto["etfId"]
) => {
  let isLoading = false;
  return async (
    groupBy: string,
    from?: string,
    to?: string
  ): Promise<OhclChartDataType[]> => {
    if (isLoading) return;
    isLoading = true;
    try {
      const data = await getOHCLDataInfo({
        groupBy,
        from,
        to,
        coinId,
        category,
        etfId,
      });
      isLoading = false;
      return data;
    } catch (error) {
      console.error(error);
    }
    isLoading = false;
  };
};

// Define the chunk duration (in seconds). Here we assume one week of data for "1m" candles.
// Adjust this constant (or make it depend on groupBy) as needed.
const CHUNK_DURATION = 60 * 60 * 24 * 7; // one week in miliseconds

export const IndexOhclChart: FC<{
  coinId: number;
  category: string;
  loaded: () => void;
  etfId: RebalanceDto["etfId"];
}> = ({ coinId, category, loaded, etfId }) => {
  const ohclChartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);

  // Keep track of the historical data loaded so far.
  const historicalDataRef = useRef<OhclChartDataType[]>([]);
  // Store the overall time range of the loaded historical data.
  const loadedRangeRef = useRef<{ from: number; to: number }>({
    from: 0,
    to: 0,
  });
  // Flag to prevent duplicate concurrent fetches.
  const isFetchingOlderRef = useRef<boolean>(false);

  const [groupBy, setGroupBy] = useState(OhclGroupByEnum["1m"]);
  const groupByRef = useRef<OhclGroupByEnum>(groupBy);

  // Live stream start timestamp (if needed by your websocket)
  const [liveStreamStartTimestamp, setLiveStreamStartTimestamp] = useState<
    number | undefined
  >();
  const liveStreamStartTimestampRef = useRef<number | undefined>(
    liveStreamStartTimestamp
  );

  // Live data from websocket – note that we will only update the chart with live data
  // if the user is scrolled to the right edge.
  const liveData = useWebsocket<OhclChartDataType>({
    url: NEXT_PUBLIC_BACKEND_SERVER_WEBSOCKET_URL + "/etf-price-stream",
    dataChange: "replace",
    params: {
      etfId,
      startTimestamp: liveStreamStartTimestamp,
      groupBy,
    },
    disabled: !liveStreamStartTimestamp,
  });

  // Create the OHLC data fetcher function.
  const getOhclData = useMemo(
    () => fetchtOhclData(coinId, category, etfId),
    [coinId, category, etfId]
  );

  // Load the initial chunk – we load from (now - CHUNK_DURATION) to now.
  const loadInitialData = useCallback(async () => {
    const data = await getOhclData(groupByRef.current);
    if (data && data.length > 0) {
      historicalDataRef.current = data;
      loadedRangeRef.current = {
        from: +data[0].time,
        to: +data[data.length - 1].time,
      };
      // Convert string numbers to numbers if needed
      candlestickSeriesRef.current.setData(
        data.map((item) => ({
          time: item.time,
          open: +item.open,
          high: +item.high,
          low: +item.low,
          close: +item.close,
        }))
      );
    }
  }, [getOhclData]);

  // Function to fetch an older data chunk if the user scrolls left.
  const fetchOlderData = useCallback(async () => {
    if (isFetchingOlderRef.current) return;
    isFetchingOlderRef.current = true;

    const currentFrom = loadedRangeRef.current.from;
    const newTo = currentFrom - 1; // Fetch older data immediately preceding the current start.
    const newFrom = currentFrom - CHUNK_DURATION;
    const olderData = await getOhclData(
      groupByRef.current,
      newFrom.toString(),
      newTo.toString()
    );
    if (olderData && olderData.length > 0) {
      // Prepend the older data to our historical data.
      historicalDataRef.current = olderData.concat(historicalDataRef.current);
      // Update the loaded range.
      loadedRangeRef.current.from = +olderData[0].time;
      // Update the chart's data.
      candlestickSeriesRef.current.setData(
        historicalDataRef.current.map((item) => ({
          time: item.time,
          open: +item.open,
          high: +item.high,
          low: +item.low,
          close: +item.close,
        }))
      );
    }
    isFetchingOlderRef.current = false;
  }, [getOhclData]);

  // Throttle the visible range change handler to avoid too many calls.
  const handleVisibleRangeChange = useCallback(
    throttle(async (range) => {
      if (!chartInstanceRef.current) return;
      if (!range) return;

      // If the left edge of the visible range is close to the earliest loaded time,
      // load an older chunk (here we use 10% of CHUNK_DURATION as threshold).
      if (range.from <= loadedRangeRef.current.from + CHUNK_DURATION * 0.1) {
        fetchOlderData();
      }

      const threshold = 60;
      if (
        range &&
        range.to >= loadedRangeRef.current.to - threshold &&
        !liveStreamStartTimestampRef?.current
      ) {
        setLiveStreamStartTimestamp(loadedRangeRef.current.to + 1);
        liveStreamStartTimestampRef.current = loadedRangeRef.current.to + 1;
      } else if (
        range &&
        range.to < loadedRangeRef.current.to &&
        liveStreamStartTimestampRef.current
      ) {
        setLiveStreamStartTimestamp(undefined);
        liveStreamStartTimestampRef.current = undefined;
      }
    }, 500),
    [fetchOlderData]
  );

  // Initialize chart on mount.
  useEffect(() => {
    if (!ohclChartRef.current) return;

    const initChart = async () => {
      // Create the chart instance.
      const chart = createChart(ohclChartRef.current, {
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
      chartInstanceRef.current = chart;

      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#26a69a",
        downColor: "#ef5350",
        borderVisible: false,
        wickUpColor: "#26a69a",
        wickDownColor: "#ef5350",
      });
      candlestickSeriesRef.current = series;

      // Load the latest historical data chunk.
      await loadInitialData();
      const scrollHandler = (newRange) => {
        handleVisibleRangeChange(newRange);
      };

      chartInstanceRef.current
        ?.timeScale()
        .subscribeVisibleTimeRangeChange(scrollHandler);

      // Signal that the chart is loaded.
      loaded && loaded();
    };

    !candlestickSeriesRef?.current && initChart();

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current
          .timeScale()
          .unsubscribeVisibleTimeRangeChange(handleVisibleRangeChange);
      }
    };
  }, [coinId, category, loaded, loadInitialData, handleVisibleRangeChange]);

  // Update live data only if the user is scrolled to the right edge.
  useEffect(() => {
    if (!chartInstanceRef.current || !candlestickSeriesRef.current || !liveData)
      return;

    const range = chartInstanceRef.current.timeScale().getVisibleRange();
    // Define a threshold (in seconds) for being "at the right edge".
    const threshold = 60; // adjust as needed

    if (range && range.to >= loadedRangeRef.current.to - threshold) {
      // Live data may be an array or a single object.
      if (Array.isArray(liveData)) {
        liveData.forEach((item) => {
          candlestickSeriesRef.current.update({
            time: +item.time,
            open: +item.open,
            high: +item.high,
            low: +item.low,
            close: +item.close,
          });
          // Also update the last candle in our stored data.
          const lastIndex = historicalDataRef.current.length - 1;
          historicalDataRef.current[lastIndex] = {
            ...historicalDataRef.current[lastIndex],
            ...item,
          };
          loadedRangeRef.current.to = item.time;
        });
      } else {
        candlestickSeriesRef.current.update({
          time: liveData.time,
          open: +liveData.open,
          high: +liveData.high,
          low: +liveData.low,
          close: +liveData.close,
        });
        const lastIndex = historicalDataRef.current.length - 1;
        historicalDataRef.current[lastIndex] = {
          ...historicalDataRef.current[lastIndex],
          ...liveData,
        };
        loadedRangeRef.current.to = +liveData.time;
      }
    }
  }, [liveData]);

  // When the user changes the groupBy (via the selector), reset the data and reload.
  const groupBySelectorHandler = useCallback(
    (value: OhclGroupByEnum) => {
      groupByRef.current = value;
      setGroupBy(value);
      // Reset our stored data and range.
      historicalDataRef.current = [];
      loadedRangeRef.current = { from: 0, to: 0 };
      // Reload initial data with the new groupBy.
      loadInitialData();
    },
    [loadInitialData]
  );

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Index OHLC Chart</CardTitle>
        </div>
        <GroupByOptions onSelect={groupBySelectorHandler} />
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

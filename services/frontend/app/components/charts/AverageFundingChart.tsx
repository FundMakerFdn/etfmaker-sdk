"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { FC, useState, useMemo, useEffect } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@radix-ui/react-select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "app/shadcn/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
} from "app/shadcn/components/ui/chart";
import { getAverageFundingChartData } from "app/data/getAverageFundingData";

const generateChartConfig = (data) => {
  if (!data || data?.length === 0) return {};

  const colors = [
    "#FF5733", // Bright Red
    "#FFBD33", // Bright Orange
    "#FFD700", // Bright Yellow
    "#33FF57", // Neon Green
    "#33FFBD", // Turquoise
    "#33D7FF", // Sky Blue
    "#3383FF", // Bright Blue
    "#8D33FF", // Purple
    "#C133FF", // Magenta
    "#FF33A8", // Hot Pink
    "#FF336E", // Rose Red
    "#FF6B33", // Bright Vermilion
    "#39FF33", // Lime Green
    "#33FF77", // Pastel Green
    "#FF5733", // Deep Coral
  ];

  const keys = Object.keys(data[0] || {}).filter((key) => key !== "date");

  const config = keys.reduce((acc, key, index) => {
    acc[key] = {
      label: key.charAt(0).toUpperCase() + key.slice(1),
      color: colors[index % colors.length],
    };
    return acc;
  }, {});

  return config;
};

export const AverageFundingChart: FC<{ coinId: number }> = ({ coinId }) => {
  //   const [timeRange, setTimeRange] = useState("90d");

  const [data, setData] = useState([]);

  useEffect(() => {
    const getData = async () => {
      const data = await getAverageFundingChartData(coinId);
      setData(data);
    };
    getData();
  }, []);

  const chartConfig = useMemo(() => generateChartConfig(data), [data]);

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Average funding chart</CardTitle>
        </div>
        {/* <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="w-[160px] rounded-lg sm:ml-auto"
            aria-label="Select a value"
          >
            <SelectValue placeholder="Last 3 months" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">
              Last 3 months
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              Last 30 days
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              Last 7 days
            </SelectItem>
          </SelectContent>
        </Select> */}
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={data}>
            <defs>
              {Object.keys(chartConfig).map((key) => (
                <linearGradient
                  key={`fill${key}`}
                  id={`fill${key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={chartConfig[key].color}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={chartConfig[key].color}
                    stopOpacity={0.1}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              content={({ label, payload }) => {
                if (!payload || payload.length === 0) return null;

                return (
                  <div
                    style={{
                      backgroundColor: "white",
                      borderRadius: "8px",
                      padding: "10px",
                      boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                      zIndex: "999999 !important",
                      position: "relative",
                      overflow: "visible !important",
                    }}
                  >
                    <strong>{new Date(label).toLocaleDateString()}</strong>
                    <ul
                      style={{
                        listStyle: "none",
                        padding: 0,
                        margin: 0,
                        maxHeight: "100%",
                      }}
                    >
                      {payload.map((entry, index) => (
                        <li
                          key={index}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            whiteSpace: "nowrap", // Prevents text wrapping issues
                          }}
                        >
                          <span />
                          <span>
                            {entry.name}: {entry.value}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              }}
            />

            {Object.keys(chartConfig).map((key) => (
              <Area
                key={key}
                dataKey={key}
                type="natural"
                fill={`url(#fill${key})`}
                stroke={chartConfig[key].color}
                stackId="a"
              />
            ))}
            <ChartLegend
              content={<ChartLegendContent className="flex flex-wrap gap-2" />}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

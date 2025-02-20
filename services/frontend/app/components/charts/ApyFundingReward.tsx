"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { FC, useEffect, useState } from "react";
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
import { ChartContainer, ChartTooltip } from "app/shadcn/components/ui/chart";
import moment from "moment";
import { getApyFundingReward } from "app/data/getApyFundingReward";

export const ApyFundingReward: FC<{ coinId: number }> = ({ coinId }) => {
  //   const [timeRange, setTimeRange] = useState("90d");

  const [data, setData] = useState([]);

  useEffect(() => {
    const getData = async () => {
      const data = await getApyFundingReward(coinId);
      setData(data);
    };
    getData();
  }, []);

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Apy funding reward chart</CardTitle>
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
          config={{
            apyFundingReward: {
              label: "Apy funding reward",
              color: "var(--chart-3)",
            },
          }}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={data}>
            <defs>
              <linearGradient id="fillETF" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--chart-3))"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--chart-3))"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => moment(value).format("MM/DD/YYYY")}
            />
            <YAxis tickFormatter={(value) => value} />
            <Area
              dataKey="value"
              type="monotone"
              fill="url(#fillETF)"
              stroke="hsl(var(--chart-3))"
            />
            <ChartTooltip
              content={({ payload }) => {
                if (!payload || payload.length === 0) return null;

                const { value, time } = payload[0].payload;

                return (
                  <div className="p-2 bg-white shadow-md rounded-md">
                    <div className="text-sm font-medium text-gray-700">
                      {new Intl.DateTimeFormat("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(time))}
                    </div>
                    <div className="text-lg font-semibold text-blue-600">
                      {new Intl.NumberFormat("en-US", {
                        style: "decimal",
                        maximumFractionDigits: 2,
                      }).format(value)}
                    </div>
                  </div>
                );
              }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

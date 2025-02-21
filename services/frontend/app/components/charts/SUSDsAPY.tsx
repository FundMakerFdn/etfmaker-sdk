"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { FC, useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "app/shadcn/components/ui/card";
import { ChartContainer, ChartTooltip } from "app/shadcn/components/ui/chart";
import { getSUSDApyData } from "app/data/getSUSDApyData";

export const SUSDeApy: FC<{
  coinId?: number;
  category?: string;
  loaded?: () => void;
}> = ({ coinId, category, loaded }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const getData = async () => {
      const data = await getSUSDApyData(coinId, category);
      setData(data);
      loaded && loaded();
    };
    getData();
  }, [coinId, category, loaded]);

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>sUSD APY chart</CardTitle>
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
            sUSDeApy: {
              label: "sUSD eAPY",
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
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
            />
            <YAxis tickFormatter={(value) => value.toExponential(2)} />
            <Area
              dataKey="value"
              type="monotone"
              fill="url(#fillETF)"
              stroke="hsl(var(--chart-3))"
            />
            <ChartTooltip />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

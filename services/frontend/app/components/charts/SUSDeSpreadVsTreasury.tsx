"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { FC, useEffect, useState } from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "app/shadcn/components/ui/select";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "app/shadcn/components/ui/card";
import { ChartContainer, ChartTooltip } from "app/shadcn/components/ui/chart";
import { getsUSDeSpreadVsTreasury } from "app/data/getsUSDeSpreadVsTreasury";

export const SUSDeSpreadVsTreasury: FC<{ coinId: number }> = ({ coinId }) => {
  const [period, setPeriod] = useState<string>("week");
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const getData = async () => {
      const sUSDeSpreadVs3mTreasuryData = await getsUSDeSpreadVsTreasury(
        coinId,
        period
      );

      setData(sUSDeSpreadVs3mTreasuryData);
    };

    getData();
  }, [coinId, period]);

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>
            sUSDe Spread vs 3m Treasury
            {period !== "All"
              ? " - " + period[0].toUpperCase() + period.slice(1) + "ly"
              : ""}
          </CardTitle>
          <CardDescription>Tracking ETF values over time</CardDescription>
        </div>

        <Select onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={period ?? "All"} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Period: </SelectLabel>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
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
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${
                  date.getMonth() + 1
                }/${date.getDate()}/${date.getFullYear()}`;
              }}
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

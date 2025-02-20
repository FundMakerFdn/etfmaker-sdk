"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../shadcn/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "../../shadcn/components/ui/chart";
import { FC, useEffect, useState } from "react";
import { getAverageYieldQuartalFundingRewardData } from "app/data/getAverageYieldQuartalFundingRewardData";

const chartConfig = {
  avgYield: {
    label: "Average Perpetual Yield by Quarter",
    color: "#3383FF",
  },
} satisfies ChartConfig;

export const AvgPerpetualYieldByQuarter: FC<{ coinId: number }> = ({
  coinId,
}) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const getData = async () => {
      const data = await getAverageYieldQuartalFundingRewardData(coinId);
      setData(
        data.map((item) => ({
          ...item,
          quarter: "Q" + item.quarter,
        }))
      );
    };
    getData();
  }, [coinId]);

  return (
    <Card>
      <CardContent>
        <CardHeader className="items-center pb-0">
          <CardTitle>Avg Perp Yield by Quarter chart</CardTitle>
        </CardHeader>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="quarter"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              //   tickFormatter={(value) => value.slice(0, 3)}
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
                      padding: "8px",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    <strong>{label}</strong>
                    <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
                      {payload.map((entry, index) => (
                        <li
                          key={index}
                          style={{
                            display: "flex",
                            gap: "6px",
                            alignItems: "center",
                          }}
                        >
                          <span style={{ fontWeight: "bold" }}>
                            {entry.name}:
                          </span>
                          <span>{Number(entry.value).toFixed(3)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              }}
            />

            <Bar dataKey="avgYield" fill="var(--color-avgYield)" radius={8} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

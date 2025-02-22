"use client";

import { Pie, PieChart } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../shadcn/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../../shadcn/components/ui/chart";
import { FC, useEffect, useState } from "react";
import { getFundingDaysDistributionData } from "app/data/getFundingDaysDistribution";

const chartConfig = {
  positive: {
    label: "Positive",
    color: "#3383FF", // Bright Blue
  },
  negative: {
    label: "Negative",
    color: "#FF5733", // Bright Red
  },
} satisfies ChartConfig;

export const FundingDaysDistribution: FC<{
  coinId?: number;
  category?: string;
  loaded?: () => void;
}> = ({ coinId, category, loaded }) => {
  const [chartData, setChartData] = useState([]);
  const [status, setStatus] = useState<"success" | "loading" | "error">(
    "loading"
  );
  const [period, setPeriod] = useState<string>();

  useEffect(() => {
    const getData = async () => {
      try {
        const response = await getFundingDaysDistributionData(
          coinId,
          period,
          category
        );
        const chartData = [
          {
            quality: "positive",
            days: response?.positive ?? 0,
            fill: "var(--color-positive)",
          },
          {
            quality: "negative",
            days: response?.negative ?? 0,
            fill: "var(--color-negative)",
          },
        ];
        setChartData(chartData);
        setStatus("success");
      } catch (error) {
        console.error("Error fetching funding days distribution data:", error);
        setStatus("error");
      }
      loaded && loaded();
    };

    getData();
  }, [coinId, category, period, loaded]);

  if (status === "loading") return <div>Loading...</div>;
  if (status === "error") return <div>Error fetching data</div>;

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Funding Days Distribution</CardTitle>
        <CardDescription>January - June 2024</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Pie
              data={chartData}
              dataKey="days"
              nameKey="quality"
              innerRadius={60}
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

"use client";

import { Pie, PieChart } from "recharts";

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
  ChartTooltipContent,
} from "../../shadcn/components/ui/chart";
import { FC, useEffect, useState } from "react";
import { processAPYDataToWeekly } from "app/helpers/processAPYDataToWeekly";
import { getApyFundingReward } from "app/data/getApyFundingReward";

const chartConfig = {
  "0-5": {
    label: "0-5",
    color: "#3383FF", // Bright Blue
  },
  "5-10": {
    label: "5-10",
    color: "#FF5733", // Bright Red
  },
  "10-15": {
    label: "10-15",
    color: "#FFD700", // Bright Blue
  },
  "15+": {
    label: "15+",
    color: "#39FF33", // Bright Red
  },
} satisfies ChartConfig;

export const SUSDeAPYWeeklyDistribution: FC<{
  coinId?: number;
  category?: string;
  loaded?: () => void;
}> = ({ coinId, category, loaded }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const getData = async () => {
      const APYFundingRewardData = await getApyFundingReward(coinId, category);
      const sUSDeAPYWeeklyDistribution = APYFundingRewardData
        ? processAPYDataToWeekly(APYFundingRewardData)
        : [];
      setData(sUSDeAPYWeeklyDistribution);
      loaded && loaded();
    };
    getData();
  }, [coinId, category, loaded]);

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>sUSDe APY Weekly Distribution</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Pie
              data={data}
              dataKey="weeks"
              nameKey="period"
              innerRadius={60}
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

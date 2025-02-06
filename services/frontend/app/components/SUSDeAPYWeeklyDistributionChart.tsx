"use client";

import { FC } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { generateDistinctDarkColors } from "app/helpers/generateDistinctDarkColors";

export const SUSDeAPYWeeklyDistributionChart: FC<{
  data: number[];
  labels: string[];
}> = ({ data, labels }) => {
  // Register the necessary Chart.js controllers & elements
  ChartJS.register(ArcElement, Tooltip, Legend);

  const config = {
    labels,
    datasets: [
      {
        label: "sUSDe APY Weekly Distribution",
        data,
        backgroundColor: generateDistinctDarkColors(data.length),
        hoverOffset: 4,
      },
    ],
  };

  return (
    <div style={{ height: 400, width: 400 }}>
      <Doughnut data={config} />
    </div>
  );
};

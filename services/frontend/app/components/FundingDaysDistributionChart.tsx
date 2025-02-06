"use client";

import { FC } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { generateDistinctDarkColors } from "app/helpers/generateDistinctDarkColors";

export const FundingDaysDistributionChart: FC<{
  data: { positive: number; negative: number };
}> = (props) => {
  // Register the necessary Chart.js controllers & elements
  ChartJS.register(ArcElement, Tooltip, Legend);

  const data = {
    labels: ["Positive", "Negative"],
    datasets: [
      {
        label: "Positive vs Negative Funding Days",
        data: [props.data.positive, props.data.negative],
        backgroundColor: generateDistinctDarkColors(2).reverse(),
        hoverOffset: 4,
      },
    ],
  };

  return (
    <div style={{ height: 400, width: 400 }}>
      <Doughnut data={data} />
    </div>
  );
};

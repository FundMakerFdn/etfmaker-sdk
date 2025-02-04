import React from "react";
import { ChartOHCL } from "./components/Chart";

export default async function Page() {
  const ohclData = await fetch("http://0.0.0.0:3001/get-etf-prices", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  }).then((res) => res.json());

  const cumulativeAPYFundingReward = await fetch(
    "http://0.0.0.0:3001/get-apy-funding-rate",
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  ).then((res) => res.json());

  return <ChartOHCL chartData={ohclData} APY={cumulativeAPYFundingReward} />;
}

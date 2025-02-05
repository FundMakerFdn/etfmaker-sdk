import React from "react";
import { IndexOhclChart } from "./components/IndexOhclChart";
import { DownloadRebalanceDataCsv } from "./components/DownloadRebalanceCsv";
import { MultilineChart } from "./components/MultilineChart";
import { SingleLineChart } from "./components/SindleLineChart";
import { CurrentAPY } from "./components/CurrentAPY";

export default async function Page() {
  const ohclData = await fetch("http://backend:3001/get-etf-prices", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  }).then((res) => res.json());

  const APYFundingRewardData = await fetch(
    "http://backend:3001/get-apy-funding-rate",
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  ).then((res) => res.json());

  const backingSystem = await fetch("http://backend:3001/get-backing-system", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  }).then((res) => res.json());

  const SUSD_APY = await fetch("http://backend:3001/get-susd-apy", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  }).then((res) => res.json());

  const averageFundingChartData = await fetch(
    "http://backend:3001/get-average-funding-chart-data",
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  ).then((res) => res.json());

  const averageYieldQuartalFundingRewardData = await fetch(
    "http://backend:3001/get-average-yield-quartal-funding-reward-data",
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  ).then((res) => res.json());

  return (
    <div
      style={{
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
      }}
    >
      <DownloadRebalanceDataCsv />

      <IndexOhclChart data={ohclData.data} />

      <div>
        <h1>APY funding reward chart</h1>
        <SingleLineChart data={APYFundingRewardData.data} />
        <CurrentAPY data={APYFundingRewardData.data} amountOfEntries={7} />
      </div>

      <div>
        <h1>Backing system chart</h1>
        <MultilineChart data={backingSystem.data} />
      </div>

      <div>
        <h1>Average funding chart</h1>
        <MultilineChart data={averageFundingChartData.data} />
      </div>

      <div>
        <h1>sUSD APY chart</h1>
        <SingleLineChart data={SUSD_APY.data} />
      </div>

      <div>
        <h1>Avg Perp Yield by Quarter chart</h1>
        <SingleLineChart
          data={averageYieldQuartalFundingRewardData.data.map((entry) => ({
            time: entry.quarter,
            value: entry.avgYield,
          }))}
        />
      </div>
    </div>
  );
}

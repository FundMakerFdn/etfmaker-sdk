import React from "react";
import { IndexOhclChart } from "./components/IndexOhclChart";
import { DownloadRebalanceDataCsv } from "./components/DownloadRebalanceCsv";
import { MultilineChart } from "./components/MultilineChart";
import { SingleLineChart } from "./components/SindleLineChart";
import { CurrentAPY } from "./components/CurrentAPY";
import { FundingDaysDistributionChart } from "./components/FundingDaysDistributionChart";
import { SUSDeAPYWeeklyDistributionChart } from "./components/sUSDeAPYWeeklyDistributionChart";

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

  const fundingDaysDistribution = await fetch(
    "http://backend:3001/get-funding-days-distribution",
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  ).then((res) => res.json());

  const sUSDeSpreadVs3mTreasuryData = await fetch(
    "http://backend:3001/get-susd-spread-vs-3m-treasury",
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  ).then((res) => res.json());

  const sUSDeAPYWeeklyDistribution = processAPYData(APYFundingRewardData.data);

  return (
    <div
      style={{
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
      }}
    >
      <DownloadRebalanceDataCsv type="saved" />
      <DownloadRebalanceDataCsv type="simulation" />

      <IndexOhclChart data={ohclData.data} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(800px, 1fr))",
          gap: "2rem",
        }}
      >
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

        <div>
          <h1>Funding Days Distribution</h1>
          <FundingDaysDistributionChart data={fundingDaysDistribution.data} />
        </div>

        <div>
          <h1>sUSD Spread vs 3m Treasury chart</h1>
          <SingleLineChart data={sUSDeSpreadVs3mTreasuryData.data} />
        </div>

        <div>
          <h1>sUSDe APY Weekly Distribution</h1>
          <SUSDeAPYWeeklyDistributionChart
            data={sUSDeAPYWeeklyDistribution.data}
            labels={sUSDeAPYWeeklyDistribution.labels}
          />
        </div>
      </div>
    </div>
  );
}

function processAPYData(data) {
  // Create buckets for each range
  const ranges = {
    "0-5": 0,
    "5-10": 0,
    "10-15": 0,
    "15+": 0,
  };

  // Count weeks in each range
  data.forEach((item) => {
    const value = item.value;
    if (value <= 5) ranges["0-5"]++;
    else if (value <= 10) ranges["5-10"]++;
    else if (value <= 15) ranges["10-15"]++;
    else ranges["15+"]++;
  });

  // Calculate percentages
  const totalWeeks = Object.values(ranges).reduce((a, b) => a + b, 0);
  const percentages = {};
  for (let range in ranges) {
    percentages[range] = ((ranges[range] / totalWeeks) * 100).toFixed(1);
  }

  return {
    data: Object.values(ranges),
    labels: Object.keys(ranges),
  };
}

"use client";

import React, { useEffect, useReducer } from "react";
import { IndexOhclChart } from "./components/IndexOhclChart";
import { DownloadRebalanceDataCsv } from "./components/DownloadRebalanceCsv";
import { MultilineChart } from "./components/MultilineChart";
import { SingleLineChart } from "./components/SindleLineChart";
import { CurrentAPY } from "./components/CurrentAPY";
import { FundingDaysDistributionChart } from "./components/FundingDaysDistributionChart";
import { SUSDeAPYWeeklyDistributionChart } from "./components/SUSDeAPYWeeklyDistributionChart";
import { FiltersByAssets } from "./components/Filters";
import { processAPYDataToWeekly } from "./helpers/processAPYDataToWeekly";

const initialState = {
  ohclData: [],
  APYFundingRewardData: [],
  backingSystem: [],
  SUSD_APY: [],
  averageFundingChartData: [],
  averageYieldQuartalFundingRewardData: [],
  fundingDaysDistribution: [],
  sUSDeSpreadVs3mTreasuryData: [],
  sUSDeAPYWeeklyDistribution: [],
  availableAssetsToFilter: [],
};

const reducer = (state, action) => {
  switch (action.type) {
    case "updateData":
      return {
        ...state,
        ohclData: action.payload.ohclData,
        APYFundingRewardData: action.payload.APYFundingRewardData,
        backingSystem: action.payload.backingSystem,
        SUSD_APY: action.payload.SUSD_APY,
        averageFundingChartData: action.payload.averageFundingChartData,
        averageYieldQuartalFundingRewardData:
          action.payload.averageYieldQuartalFundingRewardData,
        fundingDaysDistribution: action.payload.fundingDaysDistribution,
        sUSDeSpreadVs3mTreasuryData: action.payload.sUSDeSpreadVs3mTreasuryData,
        sUSDeAPYWeeklyDistribution: action.payload.sUSDeAPYWeeklyDistribution,
        availableAssetsToFilter: action.payload.availableAssetsToFilter,
      };
    default:
      return state;
  }
};

const SERVER_URL = process.env.SERVER_URL;

export default function Page() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isInitialLoaded, setIsInitialLoaded] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [coinIdFilter, setCoinIdFilter] = React.useState<
    typeof state.availableAssetsToFilter | "All"
  >("All");

  useEffect(() => {
    const updateData = async () => {
      const filter = coinIdFilter === "All" ? "" : `?coinId=${coinIdFilter}`;

      const ohclData = await fetch(
        `${SERVER_URL}/${
          filter === "" ? "get-etf-prices" : `get-coin-ohcl${filter}`
        }`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      ).then((res) => res.json());

      const APYFundingRewardData = await fetch(
        `${SERVER_URL}/get-apy-funding-rate${filter}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      ).then((res) => res.json());

      const backingSystem = await fetch(
        `${SERVER_URL}/get-backing-system${filter}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      ).then((res) => res.json());

      const SUSD_APY = await fetch(`${SERVER_URL}/get-susd-apy${filter}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }).then((res) => res.json());

      const averageFundingChartData = await fetch(
        `${SERVER_URL}/get-average-funding-chart-data${filter}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      ).then((res) => res.json());

      const averageYieldQuartalFundingRewardData = await fetch(
        `${SERVER_URL}/get-average-yield-quartal-funding-reward-data${filter}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      ).then((res) => res.json());

      const fundingDaysDistribution = await fetch(
        `${SERVER_URL}/get-funding-days-distribution${filter}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      ).then((res) => res.json());

      const sUSDeSpreadVs3mTreasuryData = await fetch(
        `${SERVER_URL}/get-susd-spread-vs-3m-treasury${filter}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      ).then((res) => res.json());

      const sUSDeAPYWeeklyDistribution = processAPYDataToWeekly(
        APYFundingRewardData.data
      );

      const availableAssetsToFilter = await fetch(
        `${SERVER_URL}/get-rebalance-assets`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      ).then((res) => res.json());

      dispatch({
        type: "updateData",
        payload: {
          ohclData: ohclData.data,
          APYFundingRewardData: APYFundingRewardData.data,
          backingSystem: backingSystem.data,
          SUSD_APY: SUSD_APY.data,
          averageFundingChartData: averageFundingChartData.data,
          averageYieldQuartalFundingRewardData:
            averageYieldQuartalFundingRewardData.data,
          fundingDaysDistribution: fundingDaysDistribution.data,
          sUSDeSpreadVs3mTreasuryData: sUSDeSpreadVs3mTreasuryData.data,
          sUSDeAPYWeeklyDistribution,
          availableAssetsToFilter: availableAssetsToFilter.data,
        },
      });
      setIsInitialLoaded(true);
      setIsLoading(false);
    };

    updateData();
  }, [coinIdFilter]);

  if (!isInitialLoaded) return <div>Loading...</div>;

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

      <FiltersByAssets
        availableAssets={state.availableAssetsToFilter}
        setFilterToProcess={(filter) => {
          setCoinIdFilter(filter);
          setIsLoading(true);
        }}
      />

      {isLoading && <div>Updating charts...</div>}

      <IndexOhclChart data={state.ohclData} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(800px, 1fr))",
          gap: "2rem",
        }}
      >
        <div>
          <h1>APY funding reward chart</h1>
          <SingleLineChart data={state.APYFundingRewardData} />
          <CurrentAPY data={state.APYFundingRewardData} amountOfEntries={7} />
        </div>

        <div>
          <h1>Backing system chart</h1>
          <MultilineChart data={state.backingSystem} />
        </div>

        <div>
          <h1>Average funding chart</h1>
          <MultilineChart data={state.averageFundingChartData} />
        </div>

        {coinIdFilter === "All" && (
          <div>
            <h1>sUSD APY chart</h1>
            <SingleLineChart data={state.SUSD_APY} />
          </div>
        )}

        <div>
          <h1>Avg Perp Yield by Quarter chart</h1>
          <SingleLineChart
            data={state.averageYieldQuartalFundingRewardData.map((entry) => ({
              time: entry.quarter,
              value: entry.avgYield,
            }))}
          />
        </div>

        <div>
          <h1>Funding Days Distribution</h1>
          <FundingDaysDistributionChart data={state.fundingDaysDistribution} />
        </div>

        <div>
          <h1>sUSD Spread vs 3m Treasury chart</h1>
          <SingleLineChart data={state.sUSDeSpreadVs3mTreasuryData} />
        </div>

        <div>
          <h1>sUSDe APY Weekly Distribution</h1>
          <SUSDeAPYWeeklyDistributionChart
            data={state.sUSDeAPYWeeklyDistribution.data}
            labels={state.sUSDeAPYWeeklyDistribution.labels}
          />
        </div>
      </div>
    </div>
  );
}

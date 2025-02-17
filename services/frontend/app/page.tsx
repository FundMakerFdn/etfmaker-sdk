"use client";

import React, { useEffect, useReducer, useState } from "react";
import { IndexOhclChart } from "./components/IndexOhclChart";
import { DownloadRebalanceDataCsv } from "./components/DownloadRebalanceCsv";
import { MultilineChart } from "./components/MultilineChart";
import { SingleLineChart } from "./components/SindleLineChart";
import { CurrentAPY } from "./components/CurrentAPY";
import { FundingDaysDistributionChart } from "./components/FundingDaysDistributionChart";
import { SUSDeAPYWeeklyDistributionChart } from "./components/SUSDeAPYWeeklyDistributionChart";
import { FiltersByAssets, FiltersByCategory } from "./components/Filters";
import { getHomePageData } from "./data/getHomePageData";

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
  availableCategoriesToFilter: [],
};

const reducer = (state, action) => {
  switch (action.type) {
    case "updateData":
      return {
        ...state,
        ...action.payload,
      };
    default:
      return state;
  }
};

export default function Page() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);
  const [error, setError] = useState<string>();
  const [coinIdFilter, setCoinIdFilter] = useState<
    typeof state.availableAssetsToFilter | "All"
  >("All");
  const [categoryFilter, setCategoryFilter] = useState<
    typeof state.availableCategoriesToFilter | "All"
  >("All");

  useEffect(() => {
    const updateData = async () => {
      let filter = "";

      if (coinIdFilter !== "All") filter += `?coinId=${coinIdFilter}`;
      if (categoryFilter !== "All") filter += `?category=${categoryFilter}`;

      try {
        await getHomePageData(filter, dispatch);
      } catch (error) {
        console.error(error);
        setError("Error during fetching data");
      }
      setIsInitialLoaded(true);
      setIsLoading(false);
    };

    updateData();
  }, [coinIdFilter, categoryFilter]);

  if (!isInitialLoaded) return <div>Loading...</div>;

  console.log(state?.availableCategoriesToFilter);

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

      {state?.availableAssetsToFilter && (
        <FiltersByAssets
          availableAssets={[
            {
              id: "All",
              name: "All",
              symbol: "",
              source: "",
            },
            ...state.availableAssetsToFilter,
          ]}
          value={coinIdFilter}
          setFilterToProcess={(filter) => {
            setCoinIdFilter(filter);
            setIsLoading(true);
          }}
        />
      )}

      {state?.availableCategoriesToFilter && (
        <FiltersByCategory
          availableCategories={["All", ...state.availableCategoriesToFilter]}
          value={categoryFilter}
          setFilterToProcess={(filter) => {
            setCategoryFilter(filter);
            setIsLoading(true);
          }}
        />
      )}

      {error && <div>{error}</div>}

      {isLoading && !error && <div>Updating charts...</div>}

      {state?.APYFundingRewardData && <IndexOhclChart data={state.ohclData} />}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(800px, 1fr))",
          gap: "2rem",
        }}
      >
        {state?.APYFundingRewardData && (
          <div>
            <h1>APY funding reward chart</h1>
            <SingleLineChart data={state.APYFundingRewardData} />
            <CurrentAPY data={state.APYFundingRewardData} amountOfEntries={7} />
          </div>
        )}

        {state?.backingSystem && (
          <div>
            <h1>Backing system chart</h1>
            <MultilineChart data={state.backingSystem} />
          </div>
        )}

        {state?.averageFundingChartData && (
          <div>
            <h1>Average funding chart</h1>
            <MultilineChart data={state.averageFundingChartData} />
          </div>
        )}

        {coinIdFilter === "All" && state?.SUSD_APY && (
          <div>
            <h1>sUSD APY chart</h1>
            <SingleLineChart data={state.SUSD_APY} />
          </div>
        )}

        {state?.averageYieldQuartalFundingRewardData && (
          <div>
            <h1>Avg Perp Yield by Quarter chart</h1>
            <SingleLineChart
              data={state.averageYieldQuartalFundingRewardData.map((entry) => ({
                time: entry.quarter,
                value: entry.avgYield,
              }))}
            />
          </div>
        )}

        {state?.fundingDaysDistribution && (
          <div>
            <h1>Funding Days Distribution</h1>
            <FundingDaysDistributionChart
              data={state.fundingDaysDistribution}
            />
          </div>
        )}

        {state?.sUSDeSpreadVs3mTreasuryData && (
          <div>
            <h1>sUSD Spread vs 3m Treasury chart</h1>
            <SingleLineChart data={state.sUSDeSpreadVs3mTreasuryData} />
          </div>
        )}

        {state?.sUSDeAPYWeeklyDistribution?.data &&
          state?.sUSDeAPYWeeklyDistribution?.labels && (
            <div>
              <h1>sUSDe APY Weekly Distribution</h1>
              <SUSDeAPYWeeklyDistributionChart
                data={state.sUSDeAPYWeeklyDistribution.data}
                labels={state.sUSDeAPYWeeklyDistribution.labels}
              />
            </div>
          )}
      </div>
    </div>
  );
}

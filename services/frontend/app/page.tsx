"use client";

import React, { useEffect, useReducer, useState } from "react";
import { IndexOhclChart } from "./components/IndexOhclChart";
import { DownloadRebalanceDataCsv } from "./components/DownloadRebalanceCsv";
import { MultilineChart } from "./components/MultilineChart";
import { SingleLineChart } from "./components/SindleLineChart";
import { CurrentAPY } from "./components/CurrentAPY";
import { FiltersByAssets, FiltersByCategory } from "./components/Filters";
import { getHomePageData } from "./data/getHomePageData";
import { SystemBacking } from "./components/charts/SystemBacking";
import { SUSDeApy } from "./components/charts/SUSDsAPY";
import { AvgPerpetualYieldByQuarter } from "./components/charts/AvgPerpetualYieldByQ";
import { FundingDaysDistribution } from "./components/charts/FundingDaysDistribution";
import { SUSDeSpreadVsTreasury } from "./components/charts/SUSDeSpreadVsTreasury";
import { SUSDeAPYWeeklyDistribution } from "./components/charts/SUSDeWeeklyDistribution";

const initialState = {
  ohclData: [],
  APYFundingRewardData: [],
  backingSystem: [],
  SUSD_APY: [],
  averageFundingChartData: [],
  averageYieldQuartalFundingRewardData: [],
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

      {state?.ohclData && <IndexOhclChart data={state.ohclData} />}

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

        {state?.backingSystem && <SystemBacking data={state.backingSystem} />}

        {state?.averageFundingChartData && (
          <div>
            <h1>Average funding chart</h1>
            <MultilineChart data={state.averageFundingChartData} />
          </div>
        )}

        {coinIdFilter === "All" && state?.SUSD_APY && (
          <SUSDeApy data={state.SUSD_APY} />
        )}

        {state?.averageYieldQuartalFundingRewardData && (
          <AvgPerpetualYieldByQuarter
            data={state.averageYieldQuartalFundingRewardData}
          />
        )}

        <FundingDaysDistribution coinId={coinIdFilter} />

        <SUSDeSpreadVsTreasury coinId={coinIdFilter} />

        {state?.APYFundingRewardData && (
          <SUSDeAPYWeeklyDistribution data={state.APYFundingRewardData} />
        )}
      </div>
    </div>
  );
}

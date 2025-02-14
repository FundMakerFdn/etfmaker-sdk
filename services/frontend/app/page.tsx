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

const NEXT_PUBLIC_SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;
console.log("SERVER_URL", NEXT_PUBLIC_SERVER_URL);

export default function Page() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isInitialLoaded, setIsInitialLoaded] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [coinIdFilter, setCoinIdFilter] = React.useState<
    typeof state.availableAssetsToFilter | "All"
  >("All");
  console.log(process.env.NEXT_PUBLIC_SERVER_URL);

  useEffect(() => {
    const updateData = async () => {
      const filter = coinIdFilter === "All" ? "" : `?coinId=${coinIdFilter}`;

      const ohclDataQuery = await fetch(
        `${NEXT_PUBLIC_SERVER_URL}/${
          filter === "" ? "get-etf-prices" : `get-coin-ohcl${filter}`
        }`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      ).then((res) => res.json());

      const APYFundingRewardDataQuery = await fetch(
        `${NEXT_PUBLIC_SERVER_URL}/get-apy-funding-rate${filter}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      ).then((res) => res.json());

      const backingSystemQuery = await fetch(
        `${NEXT_PUBLIC_SERVER_URL}/get-backing-system${filter}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      ).then((res) => res.json());

      const SUSD_APYQuery = await fetch(
        `${NEXT_PUBLIC_SERVER_URL}/get-susd-apy${filter}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      ).then((res) => res.json());

      const averageFundingChartDataQuery = await fetch(
        `${NEXT_PUBLIC_SERVER_URL}/get-average-funding-chart-data${filter}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      ).then((res) => res.json());

      const averageYieldQuartalFundingRewardDataQuery = await fetch(
        `${NEXT_PUBLIC_SERVER_URL}/get-average-yield-quartal-funding-reward-data${filter}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      ).then((res) => res.json());

      const fundingDaysDistributionQuery = await fetch(
        `${NEXT_PUBLIC_SERVER_URL}/get-funding-days-distribution${filter}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      ).then((res) => res.json());

      const sUSDeSpreadVs3mTreasuryDataQuery = await fetch(
        `${NEXT_PUBLIC_SERVER_URL}/get-susd-spread-vs-3m-treasury${filter}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      ).then((res) => res.json());

      const availableAssetsToFilterQuery = await fetch(
        `${NEXT_PUBLIC_SERVER_URL}/get-rebalance-assets`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      ).then((res) => res.json());

      const [
        ohclData,
        APYFundingRewardData,
        backingSystem,
        SUSD_APY,
        averageFundingChartData,
        averageYieldQuartalFundingRewardData,
        fundingDaysDistribution,
        sUSDeSpreadVs3mTreasuryData,
        availableAssetsToFilter,
      ] = await Promise.all([
        ohclDataQuery,
        APYFundingRewardDataQuery,
        backingSystemQuery,
        SUSD_APYQuery,
        averageFundingChartDataQuery,
        averageYieldQuartalFundingRewardDataQuery,
        fundingDaysDistributionQuery,
        sUSDeSpreadVs3mTreasuryDataQuery,
        availableAssetsToFilterQuery,
      ]);

      const sUSDeAPYWeeklyDistribution = processAPYDataToWeekly(
        APYFundingRewardData.data
      );

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

      {isLoading && <div>Updating charts...</div>}

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

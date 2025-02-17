import { processAPYDataToWeekly } from "app/helpers/processAPYDataToWeekly";
import React from "react";
import GlobalConfig from "../app.config";

const NEXT_PUBLIC_SERVER_URL = GlobalConfig.NEXT_PUBLIC_SERVER_URL;

export const getHomePageData = async (
  filter: string,
  dispatch: React.ActionDispatch<[action: any]>
) => {
  const ohclDataQuery = fetch(
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

  const APYFundingRewardDataQuery = fetch(
    `${NEXT_PUBLIC_SERVER_URL}/get-apy-funding-rate${filter}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  ).then((res) => res.json());

  const backingSystemQuery = fetch(
    `${NEXT_PUBLIC_SERVER_URL}/get-backing-system${filter}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  ).then((res) => res.json());

  const SUSD_APYQuery = fetch(
    `${NEXT_PUBLIC_SERVER_URL}/get-susd-apy${filter}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  ).then((res) => res.json());

  const averageFundingChartDataQuery = fetch(
    `${NEXT_PUBLIC_SERVER_URL}/get-average-funding-chart-data${filter}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  ).then((res) => res.json());

  const averageYieldQuartalFundingRewardDataQuery = fetch(
    `${NEXT_PUBLIC_SERVER_URL}/get-average-yield-quartal-funding-reward-data${filter}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  ).then((res) => res.json());

  const fundingDaysDistributionQuery = fetch(
    `${NEXT_PUBLIC_SERVER_URL}/get-funding-days-distribution${filter}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  ).then((res) => res.json());

  const sUSDeSpreadVs3mTreasuryDataQuery = fetch(
    `${NEXT_PUBLIC_SERVER_URL}/get-susd-spread-vs-3m-treasury${filter}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  ).then((res) => res.json());

  const availableAssetsToFilterQuery = fetch(
    `${NEXT_PUBLIC_SERVER_URL}/get-rebalance-assets`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  ).then((res) => res.json());

  const availableCategoriesToFilterQuery = fetch(
    `${NEXT_PUBLIC_SERVER_URL}/get-rebalance-categories`,
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
    availableCategoriesToFilter,
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
    availableCategoriesToFilterQuery,
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
      availableCategoriesToFilter: availableCategoriesToFilter.data,
    },
  });
};

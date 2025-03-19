"use client";

import React, { useState } from "react";
import { DownloadRebalanceDataCsv } from "./components/DownloadRebalanceCsv";
import {
  FiltersByRebalanceAssets,
  FiltersByCategory,
} from "./components/Filters";
import { IndexOhclChart } from "./components/charts/IndexOHCLChart";

const AMOUNT_OF_LOADING_ENTRIES = 1;

export default function Page() {
  const [coinId, setCoinId] = useState<number>();
  const [categoryFilter, setCategoryFilter] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadedDataCallback = (() => {
    let amountOfLoaded = 0;
    return () => {
      amountOfLoaded++;
      if (amountOfLoaded === AMOUNT_OF_LOADING_ENTRIES) {
        setIsLoading(false);
      }
    };
  })();

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

      <FiltersByRebalanceAssets value={coinId} setFilterToProcess={setCoinId} />
      <FiltersByCategory
        value={categoryFilter}
        setFilterToProcess={setCategoryFilter}
      />

      {isLoading && <div>Loading...</div>}

      <IndexOhclChart
        coinId={coinId}
        category={categoryFilter}
        loaded={loadedDataCallback}
      />

      {/* <TradingWidgetChart
        coinId={coinId}
        category={categoryFilter}
        loaded={loadedDataCallback}
      /> */}

      {/* <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(800px, 1fr))",
          gap: "2rem",
        }}
      >
        <div>
          <ApyFundingReward
            coinId={coinId}
            category={categoryFilter}
            loaded={loadedDataCallback}
          />
          <CurrentAPY
            coinId={coinId}
            amountOfEntries={7}
            category={categoryFilter}
            loaded={loadedDataCallback}
          />
        </div>

        <SystemBacking
          coinId={coinId}
          category={categoryFilter}
          loaded={loadedDataCallback}
        />

        <AverageFundingChart
          coinId={coinId}
          category={categoryFilter}
          loaded={loadedDataCallback}
        />

        <SUSDeApy
          coinId={coinId}
          category={categoryFilter}
          loaded={loadedDataCallback}
        />

        <AvgPerpetualYieldByQuarter
          coinId={coinId}
          category={categoryFilter}
          loaded={loadedDataCallback}
        />

        <FundingDaysDistribution
          coinId={coinId}
          category={categoryFilter}
          loaded={loadedDataCallback}
        />

        <SUSDeSpreadVsTreasury
          coinId={coinId}
          category={categoryFilter}
          loaded={loadedDataCallback}
        />

        <SUSDeAPYWeeklyDistribution
          coinId={coinId}
          category={categoryFilter}
          loaded={loadedDataCallback}
        />
      </div> */}
    </div>
  );
}

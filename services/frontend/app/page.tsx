"use client";

import React, { useState } from "react";
import { DownloadRebalanceDataCsv } from "./components/DownloadRebalanceCsv";
import {
  FiltersByRebalanceAssets,
  FiltersByCategory,
  FiltersByIndex,
} from "./components/Filters";
import { IndexOhclChart } from "./components/charts/IndexOHCLChart";
import { RebalanceDto } from "./types/RebalanceType";
import { IndexListTable } from "./components/tables/IndexListTable";

const AMOUNT_OF_LOADING_ENTRIES = 1;

export default function Page() {
  const [coinId, setCoinId] = useState<number>();
  const [categoryFilter, setCategoryFilter] = useState<string>();
  const [etfId, setEtfId] = useState<RebalanceDto["etfId"]>();
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

      <FiltersByIndex value={etfId} setFilterToProcess={setEtfId} />

      {etfId && (
        <>
          <FiltersByRebalanceAssets
            value={coinId}
            setFilterToProcess={setCoinId}
            etfId={etfId}
          />
          <FiltersByCategory
            value={categoryFilter}
            setFilterToProcess={setCategoryFilter}
          />
        </>
      )}

      {isLoading && <div>Loading...</div>}

      <IndexListTable />

      {etfId && (
        <IndexOhclChart
          coinId={coinId}
          category={categoryFilter}
          loaded={loadedDataCallback}
          etfId={etfId}
        />
      )}

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

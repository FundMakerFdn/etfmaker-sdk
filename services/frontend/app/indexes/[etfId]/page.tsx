"use client";

import React, { useState, use } from "react";
import { DownloadRebalanceDataCsv } from "../../components/DownloadRebalanceCsv";
import { FiltersByRebalanceAssets } from "../../components/Filters";
import { IndexOhclChart } from "../../components/charts/IndexOHCLChart";
import { EtfSpreadWeight } from "app/components/ETFSpreadWeight";
import { IndexCategoriesDistribution } from "app/components/tables/IndexCategoriesDistribution";

const AMOUNT_OF_LOADING_ENTRIES = 1;

export default function Page({
  params,
}: Readonly<{
  params: Promise<{
    etfId: string;
  }>;
}>) {
  const { etfId } = use(params);
  const [coinId, setCoinId] = useState<number>();
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

      {etfId && (
        <FiltersByRebalanceAssets
          value={coinId}
          setFilterToProcess={setCoinId}
          etfId={etfId}
        />
      )}

      {isLoading && <div>Loading...</div>}

      {etfId && (
        <>
          <IndexOhclChart
            coinId={coinId}
            loaded={loadedDataCallback}
            etfId={etfId}
          />
          <EtfSpreadWeight etfId={etfId} />
          <IndexCategoriesDistribution etfId={etfId} />
        </>
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

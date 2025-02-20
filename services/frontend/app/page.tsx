"use client";

import React, { useState } from "react";
import { IndexOhclChart } from "./components/IndexOhclChart";
import { DownloadRebalanceDataCsv } from "./components/DownloadRebalanceCsv";
import { CurrentAPY } from "./components/CurrentAPY";
import { FiltersByAssets, FiltersByCategory } from "./components/Filters";
import { SystemBacking } from "./components/charts/SystemBacking";
import { SUSDeApy } from "./components/charts/SUSDsAPY";
import { AvgPerpetualYieldByQuarter } from "./components/charts/AvgPerpetualYieldByQ";
import { FundingDaysDistribution } from "./components/charts/FundingDaysDistribution";
import { SUSDeSpreadVsTreasury } from "./components/charts/SUSDeSpreadVsTreasury";
import { SUSDeAPYWeeklyDistribution } from "./components/charts/SUSDeWeeklyDistribution";
import { ApyFundingReward } from "./components/charts/ApyFundingReward";
import { AverageFundingChart } from "./components/charts/AverageFundingChart";

export default function Page() {
  const [coinId, setCoinId] = useState<number>();
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

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

      <FiltersByAssets value={coinId} setFilterToProcess={setCoinId} />

      <FiltersByCategory
        value={categoryFilter}
        setFilterToProcess={setCategoryFilter}
      />

      <IndexOhclChart coinId={coinId} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(800px, 1fr))",
          gap: "2rem",
        }}
      >
        <ApyFundingReward coinId={coinId} />
        <CurrentAPY coinId={coinId} amountOfEntries={7} />

        <SystemBacking coinId={coinId} />

        <AverageFundingChart coinId={coinId} />

        <SUSDeApy coinId={coinId} />

        <AvgPerpetualYieldByQuarter coinId={coinId} />

        <FundingDaysDistribution coinId={coinId} />

        <SUSDeSpreadVsTreasury coinId={coinId} />

        <SUSDeAPYWeeklyDistribution coinId={coinId} />
      </div>
    </div>
  );
}

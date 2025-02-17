import { CoinType } from "app/types/CoinType";
import { FC } from "react";

export const FiltersByAssets: FC<{
  availableAssets: CoinType[];
  value: number;
  setFilterToProcess: (filter: number) => void;
}> = ({ availableAssets, setFilterToProcess, value }) => {
  return (
    <div>
      <select
        onChange={(e) => setFilterToProcess(+e.target.value)}
        value={value}
      >
        {availableAssets.map((asset) => (
          <option key={asset.id} value={asset.id}>
            {[asset.name, asset.symbol, asset.source].join(" ")}
          </option>
        ))}
      </select>
    </div>
  );
};

export const FiltersByCategory: FC<{
  availableCategories: string[];
  value: string;
  setFilterToProcess: (filter: string) => void;
}> = ({ availableCategories, setFilterToProcess, value }) => {
  return (
    <div>
      <select
        onChange={(e) => setFilterToProcess(e.target.value)}
        value={value}
      >
        {availableCategories.map((category) => (
          <option key={category} value={category}>
            {category
              .split(/[-–—‒−]+/)
              .filter(Boolean)
              .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
              .join(" ")}
          </option>
        ))}
      </select>
    </div>
  );
};

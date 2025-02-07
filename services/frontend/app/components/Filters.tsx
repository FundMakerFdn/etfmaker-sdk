import { CoinType } from "app/types/CoinType";
import { FC } from "react";

export const FiltersByAssets: FC<{
  availableAssets: CoinType[];
  setFilterToProcess: (filter: string) => void;
}> = ({ availableAssets, setFilterToProcess }) => {
  return (
    <div>
      <select onChange={(e) => setFilterToProcess(e.target.value)}>
        <option value="All">All</option>
        {availableAssets.map((asset) => (
          <option key={asset.id} value={asset.id}>
            {[asset.name, asset.symbol, asset.source].join(" ")}
          </option>
        ))}
      </select>
    </div>
  );
};

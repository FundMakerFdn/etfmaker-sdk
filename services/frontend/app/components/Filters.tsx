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

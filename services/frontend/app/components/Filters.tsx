import { CoinType } from "app/types/CoinType";
import { FC } from "react";

export const FiltersByAssets: FC<{
  availableAssets: CoinType[];
  value: string;
  setFilterToProcess: (filter: string) => void;
  byValue?: keyof CoinType;
}> = ({ availableAssets, setFilterToProcess, byValue, value }) => {
  if (!byValue) byValue = "id";

  return (
    <div>
      <select
        onChange={(e) => setFilterToProcess(e.target.value)}
        value={value}
      >
        {availableAssets.map((asset) => (
          <option key={asset.id} value={asset[byValue]}>
            {[asset.name, asset.symbol, asset.source].join(" ")}
          </option>
        ))}
      </select>
    </div>
  );
};

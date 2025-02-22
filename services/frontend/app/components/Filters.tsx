import {
  getAvailableAssetsToFilter,
  getAvailableCategoriesToFilter,
  getAvailableUsdtPairsToFilter,
} from "app/data/getFiltersData";
import { CoinType } from "app/types/CoinType";
import { FC, useEffect, useState } from "react";

export const FiltersByRebalanceAssets: FC<{
  value: number;
  setFilterToProcess: (filter: number) => void;
}> = ({ setFilterToProcess, value }) => {
  const [availableAssets, setAvailableAssets] = useState<CoinType[]>([]);

  useEffect(() => {
    const getAvailableAssets = async () => {
      const assets = await getAvailableAssetsToFilter();
      setAvailableAssets([{ id: undefined, name: "All" }, ...assets]);
    };
    getAvailableAssets();
  }, []);

  return (
    <div>
      <select
        onChange={(e) => setFilterToProcess(+e.target.value)}
        value={value}
      >
        {availableAssets.map((asset, id) => (
          <option key={asset?.id + id} value={asset.id}>
            {[asset.name, asset.symbol, asset.source].join(" ")}
          </option>
        ))}
      </select>
    </div>
  );
};

export const FiltersByAllSpotUSDTPairsAssets: FC<{
  value: number;
  setFilterToProcess: (filter: number) => void;
}> = ({ setFilterToProcess, value }) => {
  const [availableAssets, setAvailableAssets] = useState<CoinType[]>([]);

  useEffect(() => {
    const getAvailableAssets = async () => {
      const assets = await getAvailableUsdtPairsToFilter();
      setAvailableAssets(assets);
      setFilterToProcess(assets[0]?.id);
    };
    getAvailableAssets();
  }, []);

  return (
    <div>
      <select
        onChange={(e) => setFilterToProcess(+e.target.value)}
        value={value}
      >
        {availableAssets.map((asset, id) => (
          <option key={asset?.id + id} value={asset.id}>
            {[asset.name, asset.symbol, asset.source].join(" ")}
          </option>
        ))}
      </select>
    </div>
  );
};

export const FiltersByCategory: FC<{
  value: string;
  setFilterToProcess: (filter: string) => void;
}> = ({ setFilterToProcess, value }) => {
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  useEffect(() => {
    const getAvailableAssets = async () => {
      const categories = await getAvailableCategoriesToFilter();
      setAvailableCategories(["All", ...categories]);
    };
    getAvailableAssets();
  }, []);

  return (
    <div>
      <select
        onChange={(e) =>
          setFilterToProcess(
            e.target.value === "All" ? undefined : e.target.value
          )
        }
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

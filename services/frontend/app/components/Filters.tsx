import {
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectItem,
  Select,
} from "app/shadcn/components/ui/select";
import {
  getAvailableAssetsToFilter,
  getAvailableCategoriesToFilter,
  getAvailableUsdtPairsToFilter,
} from "app/data/getFiltersData";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "app/shadcn/components/ui/accordion";
import { CoinType } from "app/types/CoinType";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { OhclGroupByEnum } from "app/enums/OhclGroupBy.enum";

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

export const GroupByOptions: FC<{ onSelect: (value: string) => void }> = ({
  onSelect,
}) => {
  const [groupBy, setGroupBy] = useState<string>(OhclGroupByEnum["1m"]);

  const groupBySelectorHandler = useCallback(
    (value: string) => {
      setGroupBy(value);
      onSelect(value);
    },
    [onSelect]
  );

  const groupByTitles = useMemo(
    () => ({
      "1m": "1 minute",
      "3m": "3 minute",
      "5m": "5 minute",
      "15m": "15 minute",
      "30m": "30 minute",
      "1h": "1 hour",
      "2h": "2 hours",
      "4h": "4 hours",
      "8h": "8 hours",
      "12h": "12 hours",
      "1d": "1 day",
      "3d": "3 days",
      "1w": "1 week",
      "1M": "1 month",
    }),
    []
  );

  return (
    <Select defaultValue={groupBy} onValueChange={groupBySelectorHandler}>
      <SelectTrigger className="w-[180px]">
        <span className="w-full text-center">
          {groupByTitles[groupBy ?? OhclGroupByEnum["1m"]]}
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <Accordion type="single" collapsible>
            <AccordionItem value="item-1">
              <AccordionTrigger>Minutes</AccordionTrigger>
              {Object.values(OhclGroupByEnum)
                .filter((value) => value.includes("m"))
                .map((value) => (
                  <AccordionContent key={value}>
                    <SelectItem value={value}>
                      <span className="w-full text-center">
                        {groupByTitles[value]}
                      </span>
                    </SelectItem>
                  </AccordionContent>
                ))}
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger>Hours</AccordionTrigger>
              {Object.values(OhclGroupByEnum)
                .filter((value) => value.includes("h"))
                .map((value) => (
                  <AccordionContent key={value}>
                    <SelectItem value={value}>
                      <span className="w-full text-center">
                        {groupByTitles[value]}
                      </span>
                    </SelectItem>
                  </AccordionContent>
                ))}
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger>Other</AccordionTrigger>
              {Object.values(OhclGroupByEnum)
                .filter((value) => !value.includes("h") && !value.includes("m"))
                .map((value) => (
                  <AccordionContent key={value}>
                    <SelectItem value={value}>
                      <span className="w-full text-center">
                        {groupByTitles[value]}
                      </span>
                    </SelectItem>
                  </AccordionContent>
                ))}
            </AccordionItem>
          </Accordion>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

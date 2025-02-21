import { getApyFundingReward } from "app/data/getApyFundingReward";
import { FC, useEffect, useState } from "react";

export const CurrentAPY: FC<{
  coinId: number;
  amountOfEntries: number;
  category: string;
  loaded?: () => void;
}> = ({ coinId, amountOfEntries, category, loaded }) => {
  const [apy, setApy] = useState<number>(0);

  useEffect(() => {
    const getApy = async () => {
      const apy = await getApyFundingReward(coinId, category);
      setApy(
        apy
          ? apy
              .slice(-amountOfEntries)
              .reduce((acc, apy) => acc + +apy.value, 0) / amountOfEntries
          : 0
      );
      loaded && loaded();
    };
    getApy();
  }, [coinId, amountOfEntries, category, loaded]);

  return <div>Current APY: {apy}</div>;
};

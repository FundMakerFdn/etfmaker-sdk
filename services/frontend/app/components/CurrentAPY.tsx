import { getApyFundingReward } from "app/data/getApyFundingReward";
import { FC, useEffect, useState } from "react";

export const CurrentAPY: FC<{
  coinId: number;
  amountOfEntries: number;
}> = ({ coinId, amountOfEntries }) => {
  const [apy, setApy] = useState<number>(0);

  useEffect(() => {
    const getApy = async () => {
      const apy = await getApyFundingReward(coinId);
      setApy(
        apy
          ? apy
              .slice(-amountOfEntries)
              .reduce((acc, apy) => acc + +apy.value, 0) / amountOfEntries
          : 0
      );
    };
    getApy();
  }, [coinId]);

  return <div>Current APY: {apy}</div>;
};

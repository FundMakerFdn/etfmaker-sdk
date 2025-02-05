import { ChartDataType } from "app/types/ChartDataType";
import { FC } from "react";

export const CurrentAPY: FC<{
  data: ChartDataType[];
  amountOfEntries: number;
}> = (props) => {
  const currentAPY =
    props.data
      .slice(-props.amountOfEntries)
      .reduce((acc, apy) => acc + +apy.value, 0) / props.amountOfEntries;

  return <div>Current APY: {currentAPY}</div>;
};

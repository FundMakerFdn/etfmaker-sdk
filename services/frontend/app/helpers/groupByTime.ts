export const groupByTime = (data: any): any => {
  const groupedData = Object.groupBy(data, ({ time }) => time);

  const result = [];

  for (const [time, dataArray] of Object.entries(groupedData)) {
    if (dataArray.length > 1) {
      const spreadValue =
        (dataArray.reduce(
          (acc: number, { value }: { value: string }) => acc + +value,
          0
        ) as number) / dataArray.length;
      result.push({ time: Number(time), value: spreadValue });
    } else {
      const item = dataArray[0] as { time: string; value: string };
      result.push({
        time: Number(item.time),
        value: item.value,
      });
    }
  }

  return result;
};

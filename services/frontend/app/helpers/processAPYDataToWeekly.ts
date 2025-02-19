export const processAPYDataToWeekly = (data) => {
  const chartData = [
    {
      period: "0-5",
      weeks: 0,
      fill: "var(--color-0-5)",
    },
    {
      period: "5-10",
      weeks: 0,
      fill: "var(--color-5-10)",
    },
    {
      period: "10-15",
      weeks: 0,
      fill: "var(--color-10-15)",
    },
    {
      period: "15+",
      weeks: 0,
      fill: "var(--color-15+)",
    },
  ];

  // Count weeks in each range
  data.forEach((item) => {
    const value = item.value;
    if (value <= 5) chartData[0].weeks++;
    else if (value <= 10) chartData[1].weeks++;
    else if (value <= 15) chartData[2].weeks++;
    else chartData[3].weeks++;
  });

  return chartData;
};

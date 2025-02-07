export const processAPYDataToWeekly = (data) => {
  // Create buckets for each range
  const ranges = {
    "0-5": 0,
    "5-10": 0,
    "10-15": 0,
    "15+": 0,
  };

  // Count weeks in each range
  data.forEach((item) => {
    const value = item.value;
    if (value <= 5) ranges["0-5"]++;
    else if (value <= 10) ranges["5-10"]++;
    else if (value <= 15) ranges["10-15"]++;
    else ranges["15+"]++;
  });

  // Calculate percentages
  const totalWeeks = Object.values(ranges).reduce((a, b) => a + b, 0);
  const percentages = {};
  for (let range in ranges) {
    percentages[range] = ((ranges[range] / totalWeeks) * 100).toFixed(1);
  }

  return {
    data: Object.values(ranges),
    labels: Object.keys(ranges),
  };
};

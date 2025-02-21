export const createQueryParamsStr = (args: Record<string, number | string>) => {
  const filterData = {};
  Object.entries(args).forEach(([key, value]) => {
    if (value) {
      filterData[key] = value;
    }
  });

  const params = new URLSearchParams(filterData);
  return params.toString() ? `?${params.toString()}` : "";
};

export const IsValidDate = (date?: string): boolean => {
  return !!(date && new Date(+date * 1000).toString() !== "Invalid Date");
};

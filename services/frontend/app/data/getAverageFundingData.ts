import appConfig from "app/app.config";

const NEXT_PUBLIC_SERVER_URL = appConfig.NEXT_PUBLIC_SERVER_URL;

export const getAverageFundingChartData = async (coinId?: number) => {
  const filter = coinId ? `?coinId=${coinId}` : "";
  try {
    const averageFundingChartData = await fetch(
      `${NEXT_PUBLIC_SERVER_URL}/get-average-funding-chart-data${filter}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    ).then((res) => res.json());

    return averageFundingChartData?.data ?? [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

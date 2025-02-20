import appConfig from "app/app.config";

const NEXT_PUBLIC_SERVER_URL = appConfig.NEXT_PUBLIC_SERVER_URL;

export const getAverageYieldQuartalFundingRewardData = async (
  coinId?: number
) => {
  const filter = coinId ? `?coinId=${coinId}` : "";
  try {
    const averageYieldQuartalFundingRewardData = await fetch(
      `${NEXT_PUBLIC_SERVER_URL}/get-average-yield-quartal-funding-reward-data${filter}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    ).then((res) => res.json());

    return averageYieldQuartalFundingRewardData?.data ?? [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

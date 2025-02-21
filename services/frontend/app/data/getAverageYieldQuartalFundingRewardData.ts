import appConfig from "app/app.config";
import { createQueryParamsStr } from "app/helpers/createQueryParamsStr";

const NEXT_PUBLIC_SERVER_URL = appConfig.NEXT_PUBLIC_SERVER_URL;

export const getAverageYieldQuartalFundingRewardData = async (
  coinId?: number,
  category?: string
) => {
  const filter = createQueryParamsStr({ coinId, category });
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

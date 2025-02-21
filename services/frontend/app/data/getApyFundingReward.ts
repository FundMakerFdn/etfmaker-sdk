import { createQueryParamsStr } from "app/helpers/createQueryParamsStr";
import GlobalConfig from "../app.config";

const NEXT_PUBLIC_SERVER_URL = GlobalConfig.NEXT_PUBLIC_SERVER_URL;

export const getApyFundingReward = async (
  coinId?: number,
  category?: string
) => {
  const filter = createQueryParamsStr({ coinId, category });
  try {
    const APYFundingRewardData = await fetch(
      `${NEXT_PUBLIC_SERVER_URL}/get-apy-funding-rate${filter}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    ).then((res) => res.json());

    return APYFundingRewardData?.data ?? [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

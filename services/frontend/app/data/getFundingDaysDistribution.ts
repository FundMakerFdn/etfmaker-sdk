import appConfig from "app/app.config";
import { createQueryParamsStr } from "app/helpers/createQueryParamsStr";

export const getFundingDaysDistributionData = async (
  coinId?: number,
  period?: string,
  category?: string
) => {
  const filter = createQueryParamsStr({ coinId, period, category });
  try {
    const fundingDaysDistribution = await fetch(
      `${appConfig.NEXT_PUBLIC_SERVER_URL}/get-funding-days-distribution${filter}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    ).then((res) => res.json());

    return fundingDaysDistribution?.data ?? [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

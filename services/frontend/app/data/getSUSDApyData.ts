import appConfig from "app/app.config";
import { createQueryParamsStr } from "app/helpers/createQueryParamsStr";

const NEXT_PUBLIC_SERVER_URL = appConfig.NEXT_PUBLIC_SERVER_URL;

export const getSUSDApyData = async (coinId?: number, category?: string) => {
  const filter = createQueryParamsStr({ coinId, category });
  try {
    const SUSD_APY = await fetch(
      `${NEXT_PUBLIC_SERVER_URL}/get-susd-apy${filter}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    ).then((res) => res.json());

    return SUSD_APY?.data ?? [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

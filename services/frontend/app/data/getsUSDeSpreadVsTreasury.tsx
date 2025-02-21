import appConfig from "app/app.config";
import { createQueryParamsStr } from "app/helpers/createQueryParamsStr";

export const getsUSDeSpreadVsTreasury = async (
  coinId?: number,
  period?: string,
  category?: string
) => {
  const filter = createQueryParamsStr({ coinId, period, category });

  try {
    const sUSDeSpreadVs3mTreasuryData = await fetch(
      `${appConfig.NEXT_PUBLIC_SERVER_URL}/get-susd-spread-vs-3m-treasury${filter}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    ).then((res) => res.json());

    return sUSDeSpreadVs3mTreasuryData?.data ?? [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

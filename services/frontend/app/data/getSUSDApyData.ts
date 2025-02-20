import appConfig from "app/app.config";

const NEXT_PUBLIC_SERVER_URL = appConfig.NEXT_PUBLIC_SERVER_URL;

export const getSUSDApyData = async (coinId?: number) => {
  const filter = coinId ? `?coinId=${coinId}` : "";
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

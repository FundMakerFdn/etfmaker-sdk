import appConfig from "app/app.config";

export const getsUSDeSpreadVsTreasury = async (
  coinId?: number,
  period?: string
) => {
  let filter = "";
  if (coinId) filter = `?coinId=${coinId}`;

  if (period !== "All") filter = `?period=${period}`;

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

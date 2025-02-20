import appConfig from "../app.config";

const NEXT_PUBLIC_SERVER_URL = appConfig.NEXT_PUBLIC_SERVER_URL;

export const getBackingSystem = async (coinId?: number) => {
  const filter = coinId ? `?coinId=${coinId}` : "";
  try {
    const backingSystem = await fetch(
      `${NEXT_PUBLIC_SERVER_URL}/get-backing-system${filter}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    ).then((res) => res.json());

    return backingSystem?.data ?? [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

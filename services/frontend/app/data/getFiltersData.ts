import appConfig from "app/app.config";

const NEXT_PUBLIC_SERVER_URL = appConfig.NEXT_PUBLIC_SERVER_URL;

export const getAvailableAssetsToFilter = async () => {
  try {
    const availableAssetsToFilter = await fetch(
      `${NEXT_PUBLIC_SERVER_URL}/get-rebalance-assets`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    ).then((res) => res.json());

    return availableAssetsToFilter?.data ?? [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getAvailableCategoriesToFilter = async () => {
  try {
    const availableCategoriesToFilter = await fetch(
      `${NEXT_PUBLIC_SERVER_URL}/get-rebalance-categories`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    ).then((res) => res.json());

    return availableCategoriesToFilter?.data ?? [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

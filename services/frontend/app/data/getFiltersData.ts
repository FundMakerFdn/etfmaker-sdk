import appConfig from "app/app.config";
import { RebalanceDto } from "app/types/RebalanceType";

const NEXT_PUBLIC_SERVER_URL = appConfig.NEXT_PUBLIC_SERVER_URL;

export const getAvailableEtfIdsToFilter = async () => {
  try {
    const availableAssetsToFilter = await fetch(
      `${NEXT_PUBLIC_SERVER_URL}/get-index-ids`,
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

export const getAvailableAssetsToFilter = async (
  etfId: RebalanceDto["etfId"]
) => {
  try {
    const availableAssetsToFilter = await fetch(
      `${NEXT_PUBLIC_SERVER_URL}/get-rebalance-assets?etfId=${etfId}`,
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

export const getAvailableUsdtPairsToFilter = async () => {
  try {
    const availableAssetsToFilter = await fetch(
      `${NEXT_PUBLIC_SERVER_URL}/get-all-spot-usdt-pairs`,
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

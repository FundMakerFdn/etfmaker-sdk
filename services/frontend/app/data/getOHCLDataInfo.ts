import { createQueryParamsStr } from "app/helpers/createQueryParamsStr";
import GlobalConfig from "../app.config";

const NEXT_PUBLIC_SERVER_URL = GlobalConfig.NEXT_PUBLIC_SERVER_URL;

export const getOHCLDataInfo = async (coinId?: number, category?: string) => {
  const filter = createQueryParamsStr({ coinId, category });
  try {
    const ohclData = await fetch(
      `${NEXT_PUBLIC_SERVER_URL}/${
        filter === "" ? "get-etf-prices" : `get-coin-ohcl${filter}`
      }`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    ).then((res) => res.json());

    return ohclData?.data ?? [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

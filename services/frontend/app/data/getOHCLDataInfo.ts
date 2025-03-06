import { createQueryParamsStr } from "app/helpers/createQueryParamsStr";
import GlobalConfig from "../app.config";

const NEXT_PUBLIC_SERVER_URL = GlobalConfig.NEXT_PUBLIC_SERVER_URL;

const dataCache = new Map<string, any>();

export const getOHCLDataInfo = async (
  groupBy: string,
  from?: string,
  to?: string,
  coinId?: number,
  category?: string
) => {
  const filter = createQueryParamsStr({ groupBy, coinId, category, from, to });

  if (dataCache.has(filter)) {
    return dataCache.get(filter);
  }

  try {
    const ohclData = await fetch(
      `${NEXT_PUBLIC_SERVER_URL}/${
        coinId && category
          ? `get-coin-ohcl${filter}`
          : `get-etf-prices${filter}`
      }`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    ).then((res) => res.json());

    const data = ohclData?.data ?? [];
    data?.length > 0 && dataCache.set(filter, data);
    return data;
  } catch (error) {
    console.error(error);
    return [];
  }
};

import { createQueryParamsStr } from "app/helpers/createQueryParamsStr";
import GlobalConfig from "../app.config";
import { RebalanceDto } from "app/types/RebalanceType";

const NEXT_PUBLIC_SERVER_URL = GlobalConfig.NEXT_PUBLIC_SERVER_URL;

const dataCache = new Map<string, any>();

export const getOHCLDataInfo = async (params: {
  groupBy: string;
  from?: string;
  to?: string;
  coinId?: number;
  category?: string;
  etfId?: RebalanceDto["etfId"];
}) => {
  const filter = createQueryParamsStr(params);

  if (dataCache.has(filter)) {
    return dataCache.get(filter);
  }

  try {
    const ohclData = await fetch(
      `${NEXT_PUBLIC_SERVER_URL}/${
        params?.coinId ? `get-coin-ohcl${filter}` : `get-etf-prices${filter}`
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

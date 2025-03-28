import { createQueryParamsStr } from "app/helpers/createQueryParamsStr";
import appConfig from "../app.config";

const NEXT_PUBLIC_SERVER_URL = appConfig.NEXT_PUBLIC_SERVER_URL;

export const getIndexCategoriesDistributionData = async (etfId: string) => {
  const queryParams = createQueryParamsStr({
    etfId,
  });

  try {
    const indexCategoriesDistributionData = await fetch(
      `${NEXT_PUBLIC_SERVER_URL}/index-assets-categories-distribution${queryParams}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    ).then((res) => res.json());

    return indexCategoriesDistributionData?.data ?? [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

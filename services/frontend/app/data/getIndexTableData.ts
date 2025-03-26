import appConfig from "../app.config";

const NEXT_PUBLIC_SERVER_URL = appConfig.NEXT_PUBLIC_SERVER_URL;

export const getIndexTableListData = async () => {
  try {
    const indexListData = await fetch(
      `${NEXT_PUBLIC_SERVER_URL}/get-index-table-list`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    ).then((res) => res.json());

    return indexListData?.data ?? [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

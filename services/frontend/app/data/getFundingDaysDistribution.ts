import appConfig from "app/app.config";

export const getFundingDaysDistributionData = async ({
  coinId,
  period,
}: {
  coinId?: string;
  period: string;
}) => {
  let filter = "";
  if (coinId) filter += `?coinId=${coinId}`;
  if (period) filter += `?period=${period}`;

  const fundingDaysDistribution = await fetch(
    `${appConfig.NEXT_PUBLIC_SERVER_URL}/get-funding-days-distribution${filter}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  ).then((res) => res.json());

  return fundingDaysDistribution;
};

"use client";

import { FC } from "react";
import appConfig from "app/app.config";

export const DownloadRebalanceDataCsv: FC<{ type: "saved" | "simulation" }> = ({
  type,
}) => {
  const downloadCsv = async () => {
    const endPoint =
      type === "saved"
        ? "get-rebalance-data-csv"
        : "get-simulated-rebalance-data-csv";
    try {
      const response = await fetch(
        `${appConfig.NEXT_PUBLIC_SERVER_URL}/${endPoint}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "text/csv",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "rebalance-data.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading the CSV file:", error);
    }
  };

  return (
    <button
      style={{
        width: "fit-content",
        display: "block",
        height: "2rem",
        backgroundColor: "blue",
        color: "white",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
        padding: "0.5rem",
      }}
      onClick={downloadCsv}
    >
      Download {type === "simulation" ? "simulated " : ""}rebalance data CSV
    </button>
  );
};

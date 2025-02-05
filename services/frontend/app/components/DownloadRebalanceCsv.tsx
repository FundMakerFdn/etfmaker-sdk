"use client";

export const DownloadRebalanceDataCsv = () => {
  const downloadCsv = async () => {
    try {
      const response = await fetch(
        "http://localhost:3001/get-rebalance-data-csv",
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
      Download rebalance data CSV
    </button>
  );
};

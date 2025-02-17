import { useState, useEffect } from "react";
import GlobalConfig from "../app.config";

const NEXT_PUBLIC_SERVER_WEBSOCKET_URL =
  GlobalConfig.NEXT_PUBLIC_SERVER_WEBSOCKET_URL;

export const useWebsocket = (
  endpoint: string,
  dataChange: "unshift" | "replace" = "unshift",
  params?: Record<string, any>
) => {
  const [data, setData] = useState<any>([]);

  const url =
    NEXT_PUBLIC_SERVER_WEBSOCKET_URL +
    endpoint +
    "?" +
    new URLSearchParams({ ...params }).toString();

  useEffect(() => {
    setData([]);
    if (params && !Object.values(params).some(Boolean)) return;

    console.log(`Connecting to WebSocket at ${url}`);
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log(`Connected to WebSocket at ${url}`);
    };
    ws.onmessage = (event) => {
      if (dataChange === "unshift")
        setData((data) => [...data, JSON.parse(event.data)]);
      else setData(JSON.parse(event.data));
    };

    return () => {
      ws.close();
    };
  }, [url]);

  return data;
};

import { useState, useEffect } from "react";

export const useWebsocket = <T = any>({
  url,
  dataChange,
  params,
  defaultValue,
}: {
  url: string;
  dataChange?: "unshift" | "replace";
  params?: Record<string, any>;
  defaultValue?: T;
}): T | T[] => {
  const [data, setData] = useState<T | T[]>(defaultValue);

  !dataChange && (dataChange = "unshift");

  if (params) url += "?" + new URLSearchParams({ ...params }).toString();

  useEffect(() => {
    setData([]);
    if (params && !Object.values(params).some(Boolean)) return;

    console.log(`Connecting to WebSocket at ${url}`);
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log(`Connected to WebSocket at ${url}`);
    };
    ws.onmessage = (event) => {
      console.log("event");
      if (dataChange === "unshift")
        setData((data) => [...(data as T[]), JSON.parse(event.data)] as T[]);
      else setData(JSON.parse(event.data));
    };

    return () => {
      ws.close();
    };
  }, [url]);

  return data;
};

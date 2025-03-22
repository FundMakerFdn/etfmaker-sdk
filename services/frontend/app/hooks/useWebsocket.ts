import { useState, useEffect } from "react";

export const useWebsocket = <T = any>({
  url,
  dataChange,
  params,
  defaultValue,
  disabled,
}: {
  url: string;
  dataChange?: "unshift" | "replace";
  params?: Record<string, any>;
  defaultValue?: T;
  disabled?: boolean;
}): T => {
  const [data, setData] = useState<T>(defaultValue);

  !dataChange && (dataChange = "unshift");

  if (params) url += "?" + new URLSearchParams({ ...params }).toString();

  useEffect(() => {
    if (params && !Object.values(params).some(Boolean)) return;
    if (disabled) return;

    const ws = new WebSocket(url);

    ws.onmessage = (event) => {
      if (dataChange === "unshift")
        setData((data) => [...(data as any), JSON.parse(event.data)] as T);
      else setData(JSON.parse(event.data));
    };

    return () => {
      ws.close();
    };
  }, [url, disabled]);

  return data;
};

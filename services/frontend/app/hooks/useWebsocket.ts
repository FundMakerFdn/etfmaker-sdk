import { useState, useEffect } from "react";

const SERVER_WEBSOCKET_URL = process.env.SERVER_WEBSOCKET_URL;

export const useWebsocket = (endpoint: string) => {
  const [data, setData] = useState<Record<string, any> | null>({});

  useEffect(() => {
    const url = SERVER_WEBSOCKET_URL + endpoint;
    console.log(`Connecting to WebSocket at ${url}`);
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log(`Connected to WebSocket at ${url}`);
    };
    ws.onmessage = (event) => {
      setData(JSON.parse(event.data));
    };

    return () => {
      ws.close();
    };
  }, [endpoint]);

  return data;
};

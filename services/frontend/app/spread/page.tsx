"use client";

import { useWebsocket } from "app/hooks/useWebsocket";

export default function Page() {
  const data = useWebsocket("/order-book?symbol=USDCPLN");

  console.log(data);

  return <div>Spread</div>;
}

import { useState } from "react";

/** Remembers the order menus were opened in; returns each menu's CSS `order` (0 when closed). */
export function useOpenOrder<K extends string>(open: Record<K, boolean>) {
  const [order, setOrder] = useState<K[]>([]);
  const openKeys = (Object.keys(open) as K[]).filter((k) => open[k]);
  const next = [...order.filter((k) => open[k]), ...openKeys.filter((k) => !order.includes(k))];
  if (next.join() !== order.join()) setOrder(next);
  return (key: K) => next.indexOf(key) + 1;
}

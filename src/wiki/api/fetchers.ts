/** The query key of the players list: `["players", { kind, sortBy, limit }]`. */
export type PlayersQueryKey = readonly [string, { kind?: string; sortBy: string; limit?: number }];

import type { QueryFunctionContext } from "@tanstack/react-query";

export async function fetchPlayers({
  queryKey,
  pageParam = 1,
}: QueryFunctionContext<PlayersQueryKey, number>) {
  const [_key, { kind, sortBy, limit }] = queryKey;
  const response = await fetch(
    `${process.env.SERVER_URL}/${kind}/all?sortBy=${sortBy}&page=${pageParam}&limit=${limit}`,
  );
  if (!response.ok) {
    throw new Error(`${_key} response was not ok`);
  }

  const res = await response.json();

  return res;
}

export async function fetchMetrics({
  queryKey,
}: QueryFunctionContext<readonly string[]>): Promise<ServerMetrics> {
  const [_key] = queryKey;
  const response = await fetch(`${process.env.SERVER_URL}/metrics?timestamp=${Date.now()}`);
  if (!response.ok) {
    throw new Error(`${_key} response was not ok`);
  }
  return response.json();
}

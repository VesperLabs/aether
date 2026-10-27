/** The query key of the players list: `["players", { kind, sortBy, limit }]`. */
export type PlayersQueryKey = readonly [string, { kind?: string; sortBy: string; limit?: number }];

import type { QueryFunctionContext } from "@tanstack/react-query";

/** The URL of one page of a players list. `limit` is sent as the server's `pageSize`, when set. */
export function playersUrl(
  serverUrl: string | undefined,
  { kind, sortBy, limit }: PlayersQueryKey[1],
  page: number,
) {
  const params = new URLSearchParams({ sortBy, page: String(page) });
  if (limit !== undefined) params.set("pageSize", String(limit));
  return `${serverUrl}/${kind}/all?${params}`;
}

export async function fetchPlayers({
  queryKey,
  pageParam = 1,
}: QueryFunctionContext<PlayersQueryKey, number>) {
  const [_key, query] = queryKey;
  const response = await fetch(playersUrl(process.env.SERVER_URL, query, pageParam));
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

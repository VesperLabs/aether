export async function fetchPlayers({ queryKey, pageParam = 1 }) {
  const [_key, { kind, sortBy, limit }] = queryKey;
  const response = await fetch(
    `${process.env.SERVER_URL}/${kind}/all?sortBy=${sortBy}&page=${pageParam}&limit=${limit}`
  );
  if (!response.ok) {
    throw new Error(`${_key} response was not ok`);
  }

  return response.json();
}

export async function fetchMetrics({ queryKey }) {
  const [_key] = queryKey;
  const response = await fetch(`${process.env.SERVER_URL}/metrics?timestamp=${Date.now()}`);
  if (!response.ok) {
    throw new Error(`${_key} response was not ok`);
  }
  return response.json();
}

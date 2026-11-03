/** Asks the server at `url` how many humans are online; undefined if it can't be reached. */
export async function fetchHumansOnline(url: string): Promise<number | undefined> {
  try {
    const res = await fetch(`${url}/players/online`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return undefined;
    const body = (await res.json()) as { humans?: unknown };
    return typeof body.humans === "number" ? body.humans : undefined;
  } catch {
    return undefined;
  }
}

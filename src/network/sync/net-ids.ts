/**
 * Small numbers standing in for character ids on the binary pose wire. Each character keeps its
 * number while it is in the game; a freed number is reused, so they stay within 16 bits.
 */
export function createNetIds() {
  const byId = new Map<string, number>();
  const free: number[] = [];
  let next = 0;

  /** The character's number, given one the first time. */
  function take(id: string): number {
    let nid = byId.get(id);
    if (nid === undefined) {
      nid = free.pop() ?? next++;
      byId.set(id, nid);
    }
    return nid;
  }

  function release(id: string) {
    const nid = byId.get(id);
    if (nid === undefined) return;
    byId.delete(id);
    free.push(nid);
  }

  return { take, release };
}

export type NetIds = ReturnType<typeof createNetIds>;

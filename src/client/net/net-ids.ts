/** Character ids by net id, learned from each character's join data, to read binary poses. */
const idsByNetId = new Map<number, string>();

export function rememberNetId(character: { nid?: number; socketId?: string; id?: string }) {
  const id = character.socketId || character.id;
  if (typeof character.nid === "number" && id) idsByNetId.set(character.nid, id);
}

export function idOfNetId(nid: number) {
  return idsByNetId.get(nid);
}

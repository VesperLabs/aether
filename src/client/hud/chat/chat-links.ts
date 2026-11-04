import type { BuiltItem } from "@/content";

/** Links an item into the chat draft, when chat is open to take it. */
export function linkItemToChat(item: BuiltItem) {
  window.dispatchEvent(
    new CustomEvent("HERO_LINK_ITEM", {
      detail: { id: item.id, name: item.name ?? item.key, rarity: item.rarity },
    }),
  );
}

/** Marks what an item can be dropped on to link it. */
export const CHAT_DROP_ATTR = "data-chat-drop";

type Linkable = { name?: string; key?: string };

export const chatLinkText = (item: Linkable) => `[${item.name ?? item.key}]`;

/** Cuts `message` at each `[Item Name]` that one of `links` matches. */
export function splitChatLinks<T extends Linkable>(
  message: string,
  links: readonly T[] = [],
): (string | T)[] {
  let parts: (string | T)[] = [message];
  for (const link of links) {
    const text = chatLinkText(link);
    parts = parts.flatMap((part) => {
      if (typeof part !== "string") return [part];
      return part.split(text).flatMap((piece, i) => (i === 0 ? [piece] : [link, piece]));
    });
  }
  return parts.filter((part) => part !== "");
}

/** `value` with `[name]` added on the end, spaced from what's there. */
export function appendChatLink(value: string, name: string) {
  return `${value}${value && !value.endsWith(" ") ? " " : ""}[${name}]`;
}

/** Where each linked `[name]` sits in a draft, end exclusive. */
function findChatLinkSpans(value: string, names: readonly string[]) {
  return names
    .flatMap((name) => {
      const text = `[${name}]`;
      const spans: { start: number; end: number }[] = [];
      for (let at = value.indexOf(text); at !== -1; at = value.indexOf(text, at + 1)) {
        spans.push({ start: at, end: at + text.length });
      }
      return spans;
    })
    .sort((a, b) => a.start - b.start);
}

/**
 * Applies an edit of the draft with links as single pieces: an edit touching one, even typing inside
 * it, takes the whole link out. Returns the new draft and where the caret belongs.
 */
export function editChatDraft(before: string, after: string, names: readonly string[]) {
  let start = 0;
  const shortest = Math.min(before.length, after.length);
  while (start < shortest && before[start] === after[start]) start++;
  let tail = 0;
  while (
    tail < shortest - start &&
    before[before.length - 1 - tail] === after[after.length - 1 - tail]
  ) {
    tail++;
  }
  const inserted = after.slice(start, after.length - tail);
  let end = before.length - tail;
  for (const span of findChatLinkSpans(before, names)) {
    const hit = end > start ? start < span.end && end > span.start : isInside(span, start);
    if (!hit) continue;
    start = Math.min(start, span.start);
    end = Math.max(end, span.end);
  }
  const head = before.slice(0, start) + inserted;
  return { value: head + before.slice(end), caret: head.length };
}

function isInside(span: { start: number; end: number }, at: number) {
  return span.start < at && at < span.end;
}

/** Where a caret landing at `at` belongs: past a link it landed inside, in the way it was moving. */
export function snapChatCaret(value: string, names: readonly string[], at: number, from: number) {
  const span = findChatLinkSpans(value, names).find((s) => isInside(s, at));
  if (!span) return at;
  return at < from ? span.start : span.end;
}

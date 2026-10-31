import type { ChatCommand, ChatCommandOption } from "@/network";

/** One row in the chat popover. Picking it replaces the word being typed with `value`. */
export interface ChatSuggestion extends ChatCommandOption {
  args?: string;
}

const MAX_SUGGESTIONS = 8;

function editDistance(a: string, b: string) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length];
}

/** Prefix matches first, then ones containing what's typed, then the closest typos. */
export function rankSuggestions<T extends ChatSuggestion>(typed: string, options: readonly T[]) {
  const needle = typed.toLowerCase();
  const scoreName = (raw: string) => {
    const name = raw.toLowerCase().replace(/^\//, "");
    /* An exact match stays listed and on top, so Tab still shows it moves on to the next arg */
    if (name === needle) return -3;
    if (name.startsWith(needle)) return -2;
    if (needle && name.includes(needle)) return -1;
    return editDistance(needle, name.slice(0, needle.length));
  };
  /* Match the display name too, so "fox bl" and "foxbl" both find foxBlade */
  const score = (option: T) =>
    Math.min(
      scoreName(option.value),
      option.label ? scoreName(option.label) : Infinity,
      option.label ? scoreName(option.label.replace(/\s+/g, "")) : Infinity,
    );
  return options
    .map((option) => ({ option, score: score(option) }))
    .sort((a, b) => a.score - b.score || a.option.value.localeCompare(b.option.value))
    .slice(0, MAX_SUGGESTIONS)
    .map(({ option }) => option);
}

/**
 * What the popover should offer for a chat draft: command names while typing `/na`, then that
 * command's argument suggestions. `prefix` is the draft up to the word being replaced.
 */
export function getChatSuggestions(draft: string, commands: readonly ChatCommand[]) {
  const none = { suggestions: [] as ChatSuggestion[], prefix: draft };
  if (!draft.startsWith("/")) return none;

  const words = draft.slice(1).split(" ");
  const typed = words[words.length - 1];
  const prefix = draft.slice(0, draft.length - typed.length);

  if (words.length === 1) {
    const options = commands.map((c) => ({
      value: `/${c.name}`,
      args: c.args,
      hint: c.description,
    }));
    return { suggestions: rankSuggestions(typed, options), prefix: "" };
  }

  const command = commands.find((c) => c.name === words[0].toLowerCase());
  const args = words.slice(1, -1);
  const options = command?.complete?.(args.length, args) ?? [];
  return { suggestions: rankSuggestions(typed, options), prefix };
}

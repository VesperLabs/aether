import {
  checkChatArg,
  findChatCommand,
  formatChatArg,
  getChatArgs,
  type ChatArg,
  type ChatCommand,
  type ChatCommandOption,
} from "@/network";

/** One row in the chat popover. Picking it replaces the word being typed with `value`. */
export interface ChatSuggestion extends ChatCommandOption {
  args?: string;
  /** Other ways to type a command, slash included. */
  aliases?: readonly string[];
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

/** Between a name containing what's typed (-1) and a one-letter typo (1). */
const HINT_MATCH_SCORE = 0.5;

/**
 * Prefix matches first, then ones containing what's typed, then ones whose hint contains it
 * ("rare" finds rare items), then typos a letter or two off.
 */
function rankSuggestions<T extends ChatSuggestion>(
  typed: string,
  options: readonly T[],
  max = MAX_SUGGESTIONS,
) {
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
      ...(option.aliases?.map(scoreName) ?? []),
      needle && option.hint?.toLowerCase().includes(needle) ? HINT_MATCH_SCORE : Infinity,
    );
  return (
    options
      .map((option) => ({ option, score: score(option) }))
      /* About one wrong letter in three; anything further off isn't what they meant */
      .filter(({ score }) => score <= Math.max(1, Math.floor(needle.length / 3)))
      .sort((a, b) => a.score - b.score || a.option.value.localeCompare(b.option.value))
      .slice(0, max)
      .map(({ option }) => option)
  );
}

/** A `/command` draft read word by word: what to suggest, where the caret is, and what's wrong. */
export interface ChatDraft {
  suggestions: ChatSuggestion[];
  /** The draft up to the word being typed, which picking a suggestion replaces. */
  prefix: string;
  /** The word being typed. */
  typed: string;
  command?: ChatCommand;
  /** What the command takes, given what's typed so far. */
  specs: readonly ChatArg[];
  /** Every argument word, including the one being typed. */
  args: string[];
  /** Which argument is being typed, or -1 while typing the command's name. */
  argIndex: number;
  /** Problems with each finished argument, by index. */
  argErrors: (string | undefined)[];
  /** Why it can't be sent yet, counting the word being typed and missing arguments. */
  error?: string;
  /** Something typed is wrong (not just missing), worth telling the player. */
  invalid?: string;
  /** Only arguments are missing, so Enter should move on to the next one. */
  needsMore: boolean;
}

function listCommands(commands: readonly ChatCommand[]): ChatSuggestion[] {
  /* Player commands keep their written order, most used first; cheats are a long list, so A to Z */
  const cheats = commands.filter((c) => c.cheat).sort((a, b) => a.name.localeCompare(b.name));
  return [...commands.filter((c) => !c.cheat), ...cheats].map((c) => ({
    value: `/${c.name}`,
    args: c.args?.map(formatChatArg).join(" "),
    hint: c.description,
    aliases: c.aliases?.map((alias) => `/${alias}`),
  }));
}

/**
 * Reads a chat draft: command names while typing `/na` (all of them after a bare `/`),
 * then that command's argument suggestions and whatever is wrong with the arguments so far.
 */
export function readChatDraft(draft: string, commands: readonly ChatCommand[]): ChatDraft {
  const none: ChatDraft = {
    suggestions: [],
    prefix: draft,
    typed: "",
    specs: [],
    args: [],
    argIndex: -1,
    argErrors: [],
    needsMore: false,
  };
  if (!draft.startsWith("/") || commands.length === 0) return none;

  const words = draft.slice(1).split(" ");
  const typed = words[words.length - 1];
  const prefix = draft.slice(0, draft.length - typed.length);

  if (words.length === 1) {
    const command = findChatCommand(typed, commands);
    const suggestions =
      typed === "" ? listCommands(commands) : rankSuggestions(typed, listCommands(commands));
    const error = command || typed === "" ? undefined : `Unknown command /${typed}`;
    const invalid = error;
    const needsMore = !!command?.args?.some((a) => !a.optional);
    return { ...none, suggestions, prefix: "", typed, command, error, invalid, needsMore };
  }

  const command = findChatCommand(words[0], commands);
  const args = words.slice(1);
  const argIndex = args.length - 1;
  if (!command) {
    const error = `Unknown command /${words[0]}`;
    return { ...none, typed, prefix, args, argIndex, error, invalid: error };
  }

  const specs = getChatArgs(command, args);
  const errorAt = (i: number) => {
    const spec = specs[i];
    return spec && args[i] ? checkChatArg(spec, args[i]) : undefined;
  };
  const argErrors = args.map((_, i) => (i < argIndex ? errorAt(i) : undefined));
  const missing = specs.findIndex((spec, i) => !spec.optional && !args[i]);
  const invalid = args.map((_, i) => errorAt(i)).find(Boolean);
  const error = invalid ?? (missing >= 0 ? `Needs ${formatChatArg(specs[missing])}` : undefined);
  const options = command.complete?.(argIndex, args.slice(0, argIndex)) ?? [];
  return {
    suggestions: rankSuggestions(typed, options),
    prefix,
    typed,
    command,
    specs,
    args,
    argIndex,
    argErrors,
    error,
    invalid,
    needsMore: missing >= 0 && !errorAt(argIndex) && args.every((a, i) => i === argIndex || a),
  };
}

/**
 * Grey text drawn after the caret, like a shell's tab completion: the rest of the highlighted
 * suggestion, then placeholders for the arguments still to come (`/tp 10` → ` <y>`).
 */
export function getGhostText(draft: ChatDraft, highlighted?: ChatSuggestion) {
  const { typed, argIndex, specs } = draft;
  if (!typed && argIndex === -1) return "";
  const word = highlighted?.value.slice(argIndex === -1 ? 1 : 0) ?? "";
  const completes = !!typed && word.toLowerCase().startsWith(typed.toLowerCase());
  const rest = completes ? word.slice(typed.length) : "";

  if (argIndex === -1) {
    const args = completes ? highlighted?.args : undefined;
    return args ? `${rest} ${args}` : rest;
  }
  const later = specs.slice(argIndex + (typed ? 1 : 0)).map(formatChatArg);
  if (!typed) return later.join(" ");
  return [rest, ...later].join(" ");
}

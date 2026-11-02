import type { CommandContext } from "@/server/net/command-context";
import type { PlayerInRoom } from "@/server/player-room";

/** Answers only the player who used the cheat, as a status line, never as chat. */
interface CheatReply {
  info: (message: string) => void;
  error: (message: string) => void;
}

/** One `/command` cheat: the args are the words typed after its name. */
export type Cheat = (
  ctx: CommandContext,
  player: PlayerInRoom,
  args: string[],
  reply: CheatReply,
) => void;

/** Parses a whole number, or returns undefined. */
export function parseInteger(value: string | undefined): number | undefined {
  if (!value || !/^-?\d+$/.test(value)) return;
  return Number(value);
}

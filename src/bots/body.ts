import type { BotLink, Clock } from "./link";
import type { Senses } from "./senses";

/** What a bot's actions work with: its link, clock and senses. */
export interface BotBody {
  readonly name: string;
  readonly link: BotLink;
  readonly clock: Clock;
  readonly senses: Senses;
  /** Resolves once the server has handled everything sent before it. */
  sync(): Promise<void>;
}

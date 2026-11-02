import type { AgentLink, Clock } from "./link";
import type { Senses } from "./senses";

/** What an agent's actions work with: its link, clock and senses. */
export interface AgentBody {
  readonly name: string;
  readonly link: AgentLink;
  readonly clock: Clock;
  readonly senses: Senses;
  /** Resolves once the server has handled everything sent before it. */
  sync(): Promise<void>;
}

import { Agent } from "@/agents";
import { realClock } from "./real-clock";
import { connectSocketLink } from "./socket-link";

/** Connects a cheat-enabled test agent to a server over socket.io and logs it in. */
export async function joinTestAgent(url: string, name: string, charClass?: string) {
  const link = await connectSocketLink(url);
  return Agent.join(link, { name, charClass, clock: realClock, cheats: true });
}

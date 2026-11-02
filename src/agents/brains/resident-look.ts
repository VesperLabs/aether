import type { Agent } from "../agent";
import type { SeenCharacter } from "../senses";

/** Mobs and players closer than this count as nearby, in pixels. */
const NEARBY = 250;
/** Below this share of max hp, resting is offered first. */
const LOW_HP = 0.4;
/** How long before the same player can be greeted again. */
const GREET_AGAIN_MS = 60000;

/** What a resident can do in one beat. */
export type Choice = "rest" | "greet" | "hunt" | "wander";

/** What a resident sees in one beat: words for the planner, the options, and who they're about. */
export interface Look {
  situation: string;
  /** Most urgent first; `wander` is always there. */
  options: Partial<Record<Choice, string>> & { wander: string };
  mob?: SeenCharacter;
  player?: SeenCharacter;
}

/** Turns an agent's senses into a `Look`. Pure: it reads senses and changes nothing. */
export function look(
  agent: Agent,
  {
    lastAction,
    greetedAt,
    now,
  }: { lastAction: string; greetedAt: Map<string, number>; now: number },
): Look {
  const { senses } = agent;
  const stats = senses.hero?.stats;
  const hpShare = stats?.maxHp ? stats.hp / stats.maxHp : 1;
  const away = (c: SeenCharacter) => Math.round(Math.hypot(c.x - senses.x, c.y - senses.y));
  const nearby = [...senses.characters.values()].filter(
    (c) => c.id !== senses.selfId && !c.isDead && away(c) < NEARBY,
  );
  const mobs = nearby.filter((c) => c.isHostile).sort((a, b) => away(a) - away(b));
  const players = nearby.filter((c) => c.kind === "player");
  const mob = mobs[0];
  const player = players.find((p) => now - (greetedAt.get(p.id) ?? -Infinity) > GREET_AGAIN_MS);

  const options: Partial<Record<Choice, string>> = {};
  if (hpShare < LOW_HP) options.rest = "Rest a moment to get your health back";
  /* Greeting takes a moment, so it comes before a fight that can take a while */
  if (player) options.greet = `Say hello to ${player.name}`;
  if (mob) options.hunt = `Fight the ${mob.name} ${away(mob)} steps away`;

  const recentChat = senses.messages
    .filter((m) => m.type === "chat")
    .slice(-3)
    .map((m) => `${m.from}: ${m.message}`);
  const situation = [
    `You are ${agent.name}, level ${stats?.level ?? 1}, in ${senses.roomName}.`,
    `Health ${Math.round(hpShare * 100)}%.`,
    `Mobs nearby: ${mobs.map((m) => `${m.name} (${away(m)} steps)`).join(", ") || "none"}.`,
    `Players nearby: ${players.map((p) => p.name).join(", ") || "none"}.`,
    recentChat.length ? `Recent chat: ${recentChat.join(" | ")}.` : "",
    `Last thing you did: ${lastAction}.`,
  ].join(" ");

  return { situation, options: { ...options, wander: "Stroll around nearby" }, mob, player };
}

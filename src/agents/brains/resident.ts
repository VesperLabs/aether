import type { Rng } from "@/rules/world";
import type { Agent } from "../agent";
import type { Brain } from "../brain";
import type { Options, Planner } from "../planner";
import type { SeenCharacter } from "../senses";
import { strollNear } from "./wander";

/** Mobs and players closer than this count as nearby, in pixels. */
const NEARBY = 250;
/** Below this share of max hp, resting is offered first. */
const LOW_HP = 0.4;
/** A plan less sure than this is ignored in favour of wandering. */
const MIN_CONFIDENCE = 0.3;
/** How long before the same player can be greeted again. */
const GREET_AGAIN_MS = 60000;
const REST_MS = 3000;
const BEAT_PAUSE_MS = 800;
const GREETINGS = ["Hey there!", "Hi!", "Good hunting.", "Nice day for it.", "Hello, traveller."];

const QUESTION = "You are a player in an online RPG. What do you do next?";

/**
 * A player who lives in the world. Each beat it describes what it senses, offers the options that
 * make sense right now (most urgent first), lets the planner choose, and carries out the choice.
 * The planner can be a fast model (Jev) or `rulePlanner`; either way it can only pick an option.
 */
export function createResident(planner: Planner): Brain {
  return async (agent, { clock, rng, signal }) => {
    const greetedAt = new Map<string, number>();
    let lastAction = "just arrived";

    while (!signal.aborted) {
      /* Like a player at the respawn screen, it gets right back up */
      if (agent.senses.isDead) {
        await agent.respawn();
        lastAction = "died and came back at the spawn point";
        continue;
      }
      const { situation, options, targets } = look(agent, lastAction, greetedAt, clock.now());
      const choice = await planner(situation, QUESTION, options).then(
        (plan) =>
          plan.confidence >= MIN_CONFIDENCE && plan.choice in options ? plan.choice : "wander",
        () => "wander",
      );
      lastAction = options[choice];
      await act(agent, choice, targets, { rng, greetedAt, now: clock.now() });
      if (choice === "rest") await clock.sleep(REST_MS);
      await clock.sleep(BEAT_PAUSE_MS);
    }
  };
}

interface Targets {
  mob?: SeenCharacter;
  player?: SeenCharacter;
}

/** Turns senses into words for the planner, and the options that fit right now. */
function look(agent: Agent, lastAction: string, greetedAt: Map<string, number>, now: number) {
  const { senses } = agent;
  const stats = senses.hero?.stats;
  const hpShare = stats?.maxHp ? stats.hp / stats.maxHp : 1;
  const away = (c: SeenCharacter) => Math.round(Math.hypot(c.x - senses.x, c.y - senses.y));
  const nearby = [...senses.characters.values()].filter(
    (c) => c.id !== senses.selfId && !c.isDead && away(c) < NEARBY,
  );
  const mobs = nearby.filter((c) => c.kind === "npc").sort((a, b) => away(a) - away(b));
  const players = nearby.filter((c) => c.kind === "player");
  const mob = mobs[0];
  const player = players.find((p) => now - (greetedAt.get(p.id) ?? -Infinity) > GREET_AGAIN_MS);

  const options: Options = {};
  if (hpShare < LOW_HP) options.rest = "Rest a moment to get your health back";
  /* Greeting takes a moment, so it comes before a fight that can take a while */
  if (player) options.greet = `Say hello to ${player.name}`;
  if (mob) options.hunt = `Fight the ${mob.name} ${away(mob)} steps away`;
  options.wander = "Stroll around nearby";

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

  return { situation, options, targets: { mob, player } satisfies Targets };
}

async function act(
  agent: Agent,
  choice: string,
  { mob, player }: Targets,
  { rng, greetedAt, now }: { rng: Rng; greetedAt: Map<string, number>; now: number },
) {
  if (choice === "hunt" && mob) {
    await agent.fight(mob.id, 10000); // dying ends the fight; the next beat respawns
  } else if (choice === "greet" && player) {
    greetedAt.set(player.id, now);
    agent.say(GREETINGS[Math.floor(rng() * GREETINGS.length)]);
  } else if (choice === "wander") {
    await strollNear(agent, { x: agent.senses.x, y: agent.senses.y }, rng);
  }
}

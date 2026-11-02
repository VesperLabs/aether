import type { Rng } from "@/rules/world";
import type { Agent } from "../agent";
import type { Brain } from "../brain";
import type { Planner } from "../planner";
import { look, type Choice, type Look } from "./resident-look";
import { strollNear } from "./wander";

/** A plan less sure than this is ignored in favour of wandering. */
const MIN_CONFIDENCE = 0.3;
const REST_MS = 3000;
const BEAT_PAUSE_MS = 800;
const GREETINGS = ["Hey there!", "Hi!", "Good hunting.", "Nice day for it.", "Hello, traveller."];

const QUESTION = "You are a player in an online RPG. What do you do next?";

/**
 * A player who lives in the world. Each beat it describes what it senses, offers the options that
 * make sense right now (most urgent first), lets the planner choose, and carries out the choice.
 * The planner can be a fast model (Jev) or a rule-based one; either way it can only pick an option.
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
      const seen = look(agent, { lastAction, greetedAt, now: clock.now() });
      const choice = await choose(planner, seen);
      lastAction = seen.options[choice] ?? "";
      await act(agent, choice, seen, { rng, greetedAt, now: clock.now() });
      if (choice === "rest") await clock.sleep(REST_MS);
      await clock.sleep(BEAT_PAUSE_MS);
    }
  };
}

/** Asks the planner, falling back to wandering when it fails, is unsure or goes off-script. */
function choose(planner: Planner, { situation, options }: Look): Promise<Choice> {
  return planner(situation, QUESTION, options).then(
    (plan) =>
      plan.confidence >= MIN_CONFIDENCE && plan.choice in options
        ? (plan.choice as Choice)
        : "wander",
    () => "wander" as const,
  );
}

async function act(
  agent: Agent,
  choice: Choice,
  { mob, player }: Look,
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

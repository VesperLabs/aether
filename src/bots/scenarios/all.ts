import { attackPace } from "./attack-pace";
import { collision } from "./collision";
import { combat } from "./combat";
import { party } from "./party";
import { potionSpam } from "./potion-spam";
import { swarmed } from "./swarmed";
import type { Scenario } from "./scenario";
import { wander } from "./wander";
import { wanderRespawn } from "./wander-respawn";

/** Every scenario, in the order `npm run bots` runs them. */
export const SCENARIOS: Scenario[] = [
  collision,
  combat,
  attackPace,
  swarmed,
  party,
  wander,
  wanderRespawn,
  potionSpam,
];

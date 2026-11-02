import { attackPace } from "./attack-pace";
import { collision } from "./collision";
import { combat } from "./combat";
import { party } from "./party";
import { potionSpam } from "./potion-spam";
import { resident } from "./resident";
import { swarmed } from "./swarmed";
import { townLife } from "./town-life";
import type { Scenario } from "./scenario";
import { wander } from "./wander";

/** Every scenario, in the order `npm run bots` runs them. */
export const SCENARIOS: Scenario[] = [
  collision,
  combat,
  attackPace,
  swarmed,
  party,
  wander,
  resident,
  townLife,
  potionSpam,
];

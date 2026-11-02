import { collision } from "./collision";
import { combat } from "./combat";
import { party } from "./party";
import { potionSpam } from "./potion-spam";
import { resident } from "./resident";
import type { Scenario } from "./scenario";
import { wander } from "./wander";

/** Every scenario, in the order `npm run bots` runs them. */
export const SCENARIOS: Scenario[] = [collision, combat, party, wander, resident, potionSpam];

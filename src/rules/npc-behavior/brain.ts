import { NPC_BEHAVIORS, type BehaviorContext, type NpcBehaviorId } from "./behaviors";
import { NPC_BEHAVIOR_STICKINESS } from "./constants";

/**
 * The best-scoring behavior of `ids` (earlier wins ties), or undefined when none applies. The one
 * it is already doing gets a small bonus so two close scores don't flip back and forth.
 */
export function chooseBehavior(
  ctx: BehaviorContext,
  ids: readonly NpcBehaviorId[],
  current?: NpcBehaviorId,
): NpcBehaviorId | undefined {
  let best: NpcBehaviorId | undefined;
  let bestScore = 0;
  for (const id of ids) {
    const base = NPC_BEHAVIORS[id].score(ctx);
    const score = base > 0 && id === current ? base + NPC_BEHAVIOR_STICKINESS : base;
    if (score > bestScore) {
      best = id;
      bestScore = score;
    }
  }
  return best;
}

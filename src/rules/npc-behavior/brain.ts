import { NPC_BEHAVIORS, type BehaviorContext, type NpcBehaviorId } from "./behaviors";

/** The best-scoring behavior of `ids` (earlier wins ties), or undefined when none applies. */
export function chooseBehavior(
  ctx: BehaviorContext,
  ids: readonly NpcBehaviorId[],
): NpcBehaviorId | undefined {
  let best: NpcBehaviorId | undefined;
  let bestScore = 0;
  for (const id of ids) {
    const score = NPC_BEHAVIORS[id].score(ctx);
    if (score > bestScore) {
      best = id;
      bestScore = score;
    }
  }
  return best;
}

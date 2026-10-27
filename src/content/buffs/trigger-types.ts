import type { BuffName } from "./buff-list";

/** A buff or debuff that an item or set applies when something happens. */
export interface TriggerDefinition {
  readonly event: "onAttackHit" | "onHurt";
  readonly type: "buff" | "debuff";
  readonly name: BuffName;
  readonly level: number;
  readonly chance: number;
}

import type { buffList } from "./buff-list";

type BuffList = typeof buffList;

/** Buffs of one kind, so a trigger can't apply a debuff to its own wearer or a buff to the foe. */
type BuffNameOfType<T extends "buff" | "debuff"> = {
  [K in keyof BuffList]: BuffList[K]["type"] extends T | (T extends "buff" ? "guard" : never)
    ? K
    : never;
}[keyof BuffList];

/** A buff (lands on the wearer) or debuff (lands on the foe) that an item or set applies when something happens. */
export type TriggerDefinition = {
  readonly event: "onAttackHit" | "onHurt";
  readonly level: number;
  readonly chance: number;
} & (
  | { readonly type: "buff"; readonly name: BuffNameOfType<"buff"> }
  | { readonly type: "debuff"; readonly name: BuffNameOfType<"debuff"> }
);

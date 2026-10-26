export interface SpellDefinition {
  readonly allowedTargets?: readonly ("enemy" | "ally" | "self")[];
  readonly isMeleeAttack?: boolean;
  readonly isRangedAttack?: boolean;
  readonly isAimable?: boolean;
  readonly isMissile?: boolean;
  readonly maxVisibleTime?: number;
  readonly maxActiveTime?: number;
  readonly maxDistance?: number;
  readonly bodySize?: number;
  readonly spellSpeed?: number;
  readonly layerDepth?: "bottom" | "top";
  readonly baseCooldown?: number;
  readonly description?: string;
  readonly scaleBase?: number;
  readonly scaleMultiplier?: number;
  readonly npcCastRange?: readonly number[];
  readonly npcCastWait?: number;
  readonly tint?: string;
  readonly shouldFade?: boolean;
}

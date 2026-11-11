/*
 * What an actor can do, each with its options. Every actor starts with `DEFAULT_BEHAVIORS`; its
 * own `behaviors` merge over them and `false` turns one off. How it fights comes from what it
 * carries (weapons, spells, charges); these only tune it. Talking, following a leader or owner, and
 * getting home when stuck or pulled too far are built in, from its parts, never listed here.
 */

interface FightOptions {
  /** `onSight` goes after foes in aggro range; `whenHit` (default) only fights back. */
  readonly starts?: "onSight" | "whenHit";
  /** Backs off when a foe closes in, and holds at its longest spell's range between casts. Default: on when it holds a ranged weapon. */
  readonly keepAway?: boolean;
  /** Limps away once, for a few seconds, when its hp drops below this share of max. */
  readonly fleeBelow?: number;
  /** Fires across walls and water (fish) instead of moving for a clear shot. */
  readonly shootsOverWalls?: boolean;
}

interface WanderOptions {
  /** Walks back once it strays this far from home, px. Unset roams freely. */
  readonly radius?: number;
}

interface GuardOptions {
  /** Where it stands. Default: where it spawned. */
  readonly at?: { readonly x: number; readonly y: number };
}

export interface BehaviorOptions {
  /** Fights foes. `false` never fights, not even back (training dummies). */
  fight: FightOptions;
  /** Ambles about near home. */
  wander: WanderOptions;
  /** Holds a spot, facing down: shopkeepers, guards. */
  guard: GuardOptions;
}

export type BehaviorId = keyof BehaviorOptions;

/** An actor's behaviors: options per behavior, `false` to drop a default. */
export type ActorBehaviors = { readonly [K in BehaviorId]?: BehaviorOptions[K] | false };

/** What every actor does unless its `behaviors` say otherwise. */
export const DEFAULT_BEHAVIORS: ActorBehaviors = { fight: {}, wander: {} };

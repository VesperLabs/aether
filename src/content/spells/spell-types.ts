/**
 * A spell is how an ability behaves: how it reaches its victims (`delivery`), whom it may touch
 * (`targets`), and how it looks. How strong it is (damage, buffs, costs, rank) lives on the spell
 * item that names it as its `base`, so two items can share one spell at different power.
 */
export interface SpellDefinition {
  readonly delivery: Delivery;
  /** Who it may touch: anyone else is passed through. */
  readonly targets: readonly SpellTarget[];
  readonly look: SpellLook;
  /** Its own cooldown in ms, on top of the caster's shared cast delay. */
  readonly cooldown?: number;
  /** Size at rank `r` is `base + r * perRank` times the delivery's size. Default 1. */
  readonly scale?: { readonly base: number; readonly perRank?: number };
  /** Hides the caster. Casting it breaks none of the caster's buffs (stealth among them). */
  readonly vanishes?: boolean;
  /** NPCs cast it with their target this far away, edge to edge for bursts, else centre to centre. */
  readonly npcRange?: readonly [min: number, max: number];
  /**
   * Whether it goes on through everyone it hits (the default) or stops at the first one it may
   * touch (`false`: a thrown ball), passing anyone it may not. Not tied to projectiles: an arrow
   * or a weapon's swing could stop the same way.
   */
  readonly pierces?: boolean;
  /**
   * Banks off walls and the map's edge instead of flying through them (a thrown ball). Its range
   * is then how far it has flown, bounces and all.
   */
  readonly ricochet?: Ricochet;
  /** A dash that touches no one, carrying the caster to where the target will be. */
  readonly pounces?: boolean;
  readonly description?: string;
}

type SpellTarget = "enemy" | "ally" | "self";

/** How a spell banks off walls. */
interface Ricochet {
  /**
   * How far past a wall's face its middle goes before it turns back, in pixels, so the bounce
   * lands: it sinks into the wall and comes back out. 0 bounces on the face; less, short of it.
   */
  readonly depth: number;
  /** The share of its speed into a wall it keeps coming off it, 0 to 1. Default 1. */
  readonly bounciness?: number;
}

/** How a spell reaches its victims. Sizes are radii in pixels, times in ms. */
type Delivery = Swing | Projectile | Dash | Burst | Aura;

/** A weapon swing from the caster's hand, as far as the weapon reaches. */
interface Swing {
  readonly type: "swing";
  readonly size: number;
  readonly hitMs: number;
}

/** Flies from the caster along the aim. Without a `range` it flies as far as the bow reaches. */
interface Projectile {
  readonly type: "projectile";
  readonly size: number;
  readonly speed: number;
  readonly range?: number;
}

/** Dashes the caster along the aim, hitting whoever it runs through. */
interface Dash {
  readonly type: "dash";
  readonly size: number;
  readonly speed: number;
  readonly hitMs: number;
}

/** A blast where the caster stands that stays put. */
interface Burst {
  readonly type: "burst";
  readonly shape: "circle" | "box";
  readonly size: number;
  readonly hitMs: number;
}

/** Rides the caster for a moment, touching them and anyone it overlaps (buffs). */
interface Aura {
  readonly type: "aura";
  readonly size: number;
  readonly hitMs: number;
}

export interface SpellLook {
  /** How long it is drawn, in ms. Projectiles are drawn until they land. */
  readonly visibleMs: number;
  /** Drawn under the caster (`below`) or over the world (`above`). */
  readonly layer: "below" | "above";
  /** A looping animation, or an icon from the `icons` atlas (an arrow). Swings draw their own arc. */
  readonly sprite?: { readonly animation: string } | { readonly icon: string };
  /**
   * Stays upright as it flies instead of turning to face its way, mirrored when it flies left: a
   * ball whose animation already rolls.
   */
  readonly upright?: boolean;
  /**
   * How it ends when it runs out without hitting: it fizzles (the default), or it drops and `rolls`
   * on a little, lies there, and pixelates away (a thrown ball). One with a shadow lands instead.
   */
  readonly spent?: "fizzles" | "rolls";
  readonly tint?: string;
  /** The light it gives off at night: a color and how far it reaches, in pixels. */
  readonly light?: { readonly color: string; readonly radius: number };
  readonly fades?: boolean;
  /** Casts a faint copy of its sprite on the ground below it as it flies, at the caster's feet. */
  readonly shadow?: boolean;
  readonly sound?: string;
}

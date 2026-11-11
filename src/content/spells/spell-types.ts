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
  readonly description?: string;
}

type SpellTarget = "enemy" | "ally" | "self";

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
  readonly tint?: string;
  /** The light it gives off at night: a color and how far it reaches, in pixels. */
  readonly light?: { readonly color: string; readonly radius: number };
  readonly fades?: boolean;
  readonly sound?: string;
}

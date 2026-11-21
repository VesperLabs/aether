import { assetList } from "../assets/asset-list";
import { BODY_FILES } from "./body-files";

/** Where a hand is, in pixels from the character's position, in one animation frame. */
export interface HandOffset {
  readonly x: number;
  readonly y: number;
}

/** How a hand holds its weapon on one frame: its point, and how the weapon turns there. */
export interface HandPose extends HandOffset {
  readonly flipX?: boolean;
  readonly flipY?: boolean;
  readonly rotation?: number;
}

/** A body's hands on one frame; a hand it doesn't have is left out. */
export type FrameHands = { readonly left?: HandPose; readonly right?: HandPose };

/** Where a body can go: `land` wades slowly through water, `water` swims and keeps to it, `air` flies over it. */
export type BodyHabitat = "land" | "water" | "air";

/** A body's size and points, in sprite pixels at scale 1, measured from its feet. */
export interface BodyShape {
  /** The box spells must touch to hit it, standing on the bottom of its feet. */
  readonly hitBox: { readonly width: number; readonly height: number };
  /** The circle round its feet: melee contact, reach and the bottom of the hit box. */
  readonly feetRadius: number;
  /** Where its head is (negative is up): its health bar, speech bubble and stun stars. */
  readonly headY: number;
  /** How far its sprite's middle is drawn above its feet (`bodyOffsetY`). */
  readonly spriteAboveFeet: number;
}

/**
 * Everything about a body, as its file (`bodies/<race>.json`) has it; the sprite lab's body window
 * edits it. Every body sets its whole shape: nothing is filled in from another body.
 */
export interface BodyData extends BodyShape {
  /** Leaves a grave where it dies; one that doesn't is a mob, its name hidden until a fight. */
  readonly leavesGrave?: boolean;
  /**
   * Where it can go: `land` wades slowly through water, `water` swims and keeps to it, `air` flies
   * over it. A list is a body that switches between them (a bird on the ground and in flight), the
   * first where it starts. Each later one has its own ordinary sheet, `<race>-<habitat>`.
   */
  readonly habitat: BodyHabitat | readonly BodyHabitat[];
  /** The part of its sheet a portrait shows (inventory, wiki), as `[x, y, width, height]`. */
  readonly portraitRect: readonly number[];
  /** How wide the shadow at its feet is, px; unset is half again its hit box (see `shadowOf`). */
  readonly shadowWidth?: number;
  /** Has `attack_left`/`attack_right` animations; other bodies just stand while attacking. */
  readonly attackAnims?: boolean;
  /**
   * Where it holds things, by animation frame (`down-stand`, `up-attack_right`). A body has a hand
   * when its points place it on some frame, never by a flag; without any, it attacks with what its
   * sprite shows (claws, teeth, slime).
   */
  readonly hands?: Readonly<Record<string, FrameHands>>;
}

/**
 * What a character's body can do and how big it is, by its `race`. Rules ask the body, never "is it
 * human".
 */
export interface BodyDefinition extends Omit<BodyData, "habitat"> {
  /** Where it starts out: the first of its habitats. */
  readonly habitat: BodyHabitat;
  /** Every habitat it switches between, one sheet each; just `habitat` for most bodies. */
  readonly habitats: readonly BodyHabitat[];
  readonly leavesGrave: boolean;
  /**
   * Drawn in layers like a player: a bare chest, face, hair and gear sheets over its own. Never a
   * flag: a body is layered once its race has those sheets in the asset list.
   */
  readonly layered: boolean;
  readonly handLeft: boolean;
  readonly handRight: boolean;
  readonly attackAnims: boolean;
}

const HABITATS: readonly string[] = ["land", "water", "air"] satisfies BodyHabitat[];

const isHabitat = (value: unknown): value is BodyHabitat =>
  typeof value === "string" && HABITATS.includes(value);

/** A body's file, checked once at load: JSON can't say a habitat is one of the three. */
const readBody = (
  race: string,
  data: Omit<BodyData, "habitat"> & { habitat: string | string[] },
) => {
  const list = typeof data.habitat === "string" ? [data.habitat] : data.habitat;
  if (!list.length || !list.every(isHabitat)) throw new Error(`${race}.json: unknown habitat`);
  return data as BodyData;
};

const bodies = Object.fromEntries(
  Object.entries(BODY_FILES).map(([race, data]) => [race, readBody(race, data)]),
) as Record<keyof typeof BODY_FILES, BodyData>;

export type BodyId = keyof typeof bodies;

const hasHandIn = (data: BodyData, hand: keyof FrameHands) =>
  Object.values(data.hands ?? {}).some((frame) => !!frame[hand]);

/** Whether `race` has its own layer sheets: a bare chest to dress, for either gender. */
const hasLayerSheets = (race: string | undefined) =>
  !!race &&
  assetList.some(
    ({ texture }) =>
      texture === `${race}-male-chest-bare` || texture === `${race}-female-chest-bare`,
  );

const habitatsOf = ({ habitat }: BodyData) => (typeof habitat === "string" ? [habitat] : habitat);

const define = (race: string | undefined, data: BodyData): BodyDefinition => ({
  ...data,
  habitat: habitatsOf(data)[0],
  habitats: habitatsOf(data),
  handLeft: hasHandIn(data, "left"),
  handRight: hasHandIn(data, "right"),
  attackAnims: !!data.attackAnims,
  leavesGrave: !!data.leavesGrave,
  layered: hasLayerSheets(race),
});

/* Built once: rules ask every tick, and the data never changes while running */
const DEFINITIONS = new Map<string, BodyDefinition>(
  Object.entries(bodies).map(([race, data]) => [race, define(race, data)]),
);
/* A race with no body of its own is shaped like a human, but can't hold or swing anything */
const { hitBox, feetRadius, headY, spriteAboveFeet, portraitRect, habitat } = bodies.human;
const UNKNOWN = define(undefined, {
  hitBox,
  feetRadius,
  headY,
  spriteAboveFeet,
  portraitRect,
  habitat,
});

/** Whether a body has either hand. */
export const hasAnyHand = (body: BodyDefinition) => body.handLeft || body.handRight;

/** The body of a `race`; unknown races get the human's shape with no hands or attack animations. */
export const getBody = (race: string | undefined): BodyDefinition =>
  DEFINITIONS.get(race ?? "") ?? UNKNOWN;

/** A body's shape grown by its scale: the size and points a character really has in the world. */
export const getBodyShape = (race: string | undefined, scale = 1): BodyShape => {
  const shape = getBody(race);
  return {
    hitBox: {
      width: Math.round(shape.hitBox.width * scale),
      height: Math.round(shape.hitBox.height * scale),
    },
    feetRadius: shape.feetRadius * scale,
    headY: shape.headY * scale,
    spriteAboveFeet: shape.spriteAboveFeet * scale,
  };
};

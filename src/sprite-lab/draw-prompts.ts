import { DIRECTIONS } from "@/ui";
import { getAttackingHand } from "./hand-guide";
import type { Frame } from "./lab-state";

const KEEP_STYLE = `Keep the same square canvas, blocky pixels, limited palette and hard edges, with no anti-aliasing, shadows or text.`;

/** Fills an empty request, so a blank line isn't taken as a cue to change something. */
const NO_CHANGE = "None. Add nothing beyond the example.";

/** The wearable draw. The reply keeps the body, which lines it up; it's cut out after. */
const WEARABLE_PROMPT = `You are given four images of pixel art on solid magenta.

The first image is the work so far on this frame. It may be empty, in which case start fresh.

The second image is the example: this same character wearing the clothing, standing, from four sides, left to right: from behind, facing right, facing the viewer, facing left. {slot} This is the exact design to use. Copy what it shows from each side. Do not invent a new item.

The third image is the character's body. Copy it exactly: same pose, facing direction, size, position and proportions, on the same canvas and framing. Do not move, zoom, crop or redraw it.

The fourth image is that same body with coloured rings and labels marking its hands. It is only a guide to which arm is which, here in this pose. Use it to put each sleeve on the correct arm. Never draw the rings, labels or black boxes. A hand with no label is hidden behind the body.

Dress this body in that clothing, as it looks from this angle and in this pose. Follow the torso, arms and legs, and move sleeves and trouser legs with the limbs. Keep the clothing's design, colours, outline and level of detail.

The example is complete. Everything on the character in it that isn't bare body is the clothing, and there is nothing more to it. Any part of the body that is bare in the example stays bare in your drawing. Do not add anything the example doesn't show: no extra armour, straps, belts, trim, gloves, boots, collars, shoulder pieces or decoration. If the work so far has anything the example doesn't, leave it out.

Return the whole character wearing the clothing on solid magenta (#FF00FF), with the bare body showing wherever the clothing doesn't cover it.

${KEEP_STYLE}

{frame}

Change: {request}`;

/** The default core prompt: redraw this frame of the human. */
export const HUMAN_PROMPT = `This is a pixel-art game character on a solid magenta background. Redraw this one frame with the change below, and keep everything else the same: the character, art style, palette and limb lengths. Keep solid magenta (#FF00FF) behind it.

Keep the same head size, the same chibi proportions with short stubby limbs, and where the feet stand on the canvas.

Keep the same square canvas, blocky pixels, limited palette and hard edges, with no anti-aliasing, shadows or text.

{frame}

Change: {request}`;

/** The default for drawing a diagonal: the same sprite, turned an eighth of the way round. */
export const QUARTER_TURN_PROMPT = `This is a pixel-art game character on a solid magenta background. Redraw this exact frame turned on the spot to face {diagonal}, a three-quarter view halfway between its current facing and the next one. It is the same sprite seen from a slightly different angle, not a new drawing.

Nothing about the character changes except the angle: the same character, clothing, colours, art style, palette, level of detail and pose. Any walking or attacking stays at the same moment of the motion.

Turning never changes the stride. Work out which of the character's own arms and legs is forward and which is back in the original, then keep exactly that: the same leg stepping forward, the same arm swinging forward, at the same reach. Do not swap them, do not mirror or flip the image, and do not move on to the next step of the walk. The character's own left limbs stay its left limbs and its right limbs stay its right limbs, even where the turn moves them to a different side of the image.

Everything must line up with the original, row for row. The top of the head, eyes, chin, shoulders, waist, hands and soles of the feet stay at exactly the same heights. The same head size, the same chibi proportions with short stubby limbs, and the same total height. The feet stay on the same spot on the canvas and the body stays centred on it. Only what the turn itself moves shifts sideways: the far side of the body narrows and the near side widens.

Keep solid magenta (#FF00FF) behind it. Keep the same square canvas, blocky pixels, limited palette and hard edges, with no anti-aliasing, shadows or text.

The original frame: {frame}

Anything else to change, if any is listed; if nothing follows, only turn the character, and if it names another diagonal, face that one instead: {request}`;

/** Each row turns clockwise, so the four rows between them cover all four diagonals. */
const DIAGONALS = {
  up: "north-east (away from the viewer and toward the right edge of the image; its right arm and leg are the nearer ones)",
  right:
    "south-east (toward the viewer and toward the right edge of the image; its right arm and leg are the nearer ones)",
  down: "south-west (toward the viewer and toward the left edge of the image; its left arm and leg are the nearer ones)",
  left: "north-west (away from the viewer and toward the left edge of the image; its left arm and leg are the nearer ones)",
};

/** Which limbs are which on screen, since "left" and "right" alone get muddled. */
const describeLimbs = (direction: string) => {
  if (direction === "down" || direction === "up") {
    const [left, right] = direction === "down" ? ["right", "left"] : ["left", "right"];
    return `On screen, the character's ${left} arm and leg are on the left of the image and the ${right} arm and leg are on the right.`;
  }
  const far = direction === "right" ? "left" : "right";
  return `This is a side view. "Forward" means toward the ${direction} edge of the image and "back" means toward the opposite edge. The character's ${direction} arm and leg are the NEAR limbs: closest to the viewer, fully visible and drawn in front of the body. The ${far} arm and leg are the FAR limbs: farthest from the viewer, partly hidden and drawn behind the body.`;
};

/** The frame in words, from its place on the sheet: stand, three walk steps, two attacks. */
export const describeFrame = ({ column, row }: Frame) => {
  const direction = DIRECTIONS[row];
  const hand = getAttackingHand({ column, row });
  const isSide = direction === "left" || direction === "right";
  const limb = hand === direction ? "near" : "far";
  const doing =
    column === 0
      ? "standing still"
      : hand
        ? `attacking with the ${hand} hand${isSide ? ` (the ${limb} arm)` : ""}`
        : `walking, frame ${column} of a 3-frame walk cycle`;
  const facing =
    direction === "up"
      ? "facing away from the viewer"
      : direction === "down"
        ? "facing the viewer"
        : `facing ${direction}`;
  return `This frame shows the character ${facing}, ${doing}. ${describeLimbs(direction)}`;
};

/** Says what a wearable is, so a small piece isn't mistaken for something else. */
const describeSlot = (layer?: string) =>
  layer
    ? `This item goes in the ${layer} slot and stays where that is worn. Do not turn it into a different kind of item, such as a glove.`
    : "";

/** The whole prompt a wearable draw sends. */
export const fillWearablePrompt = (frame: Frame, request: string, layer?: string) =>
  fillPrompt(
    WEARABLE_PROMPT.replaceAll("{slot}", describeSlot(layer)),
    frame,
    request || NO_CHANGE,
  );

export const fillPrompt = (core: string, frame: Frame, request: string) =>
  core
    .replaceAll("{diagonal}", DIAGONALS[DIRECTIONS[frame.row]])
    .replaceAll("{frame}", describeFrame(frame))
    .replaceAll("{request}", request);

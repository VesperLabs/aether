import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Box, FieldHint, Flex, loadSheet, Switch, Text } from "@/ui";
import { FramePreview } from "./frame-preview";
import { useFrameStack } from "./frame-stack";
import { getNudgeOffset, isTyping } from "./frame-editing";
import type { Frame } from "./lab-state";
import { WEAPON_SHEETS, type HumanLayer, type Sheet } from "./sheets";
import { getNoneOption, getSheetOption } from "./sheet-thumb";
import { hasHandIn } from "./use-hand-points";
import type { PendingCandidate } from "./use-pending-candidates";
import {
  getPoseName,
  getStartHand,
  HANDS,
  paintWeaponFrame,
  type Hand,
  type WeaponPoses,
} from "./weapon-pose";

/** Weapons are drawn on 100px frames, wider than a human's. */
const PREVIEW_SIZE = 120;

/** The weapons a body's hands can be tried with. */
export const WEAPON_OPTIONS = [
  getNoneOption("no weapon"),
  ...WEAPON_SHEETS.map((sheet) => getSheetOption(sheet)),
];

type HandPointsProps = {
  poses: WeaponPoses | undefined;
  onPlace: (place: { frame: string; hand: Hand; x: number; y: number; done: boolean }) => void;
  /** Whether the arrow keys are this editor's right now; always, when unset. */
  isActive?: () => boolean;
  /** A line under the frame's name, such as where the points came from. */
  notice?: string;
  error?: string;
  /** The weapon to try in the hand; without one, a ring marks the point. */
  weapon?: Sheet;
  frame: Frame;
  cell: number;
  base: Sheet;
  layers: { layer: HumanLayer; sheet: Sheet }[];
  pending: PendingCandidate[];
};

/**
 * A body's hand points on the selected frame: where it holds a weapon, dragged or nudged into
 * place. The points and what saving them means belong to the page: `onPlace` hears every move,
 * with `done` once a drag or a nudge has finished.
 */
export const HandPointsEditor = ({
  poses,
  onPlace,
  isActive = () => true,
  notice,
  error,
  weapon,
  frame,
  cell,
  base,
  layers,
  pending,
}: HandPointsProps) => {
  const stack = useFrameStack(base, layers, pending);
  const [image, setImage] = useState<HTMLCanvasElement | null>(null);
  const [picked, setPicked] = useState<{ name?: string; hand: Hand }>();
  const [pointOnly, setPointOnly] = useState(false);

  const name = getPoseName(frame);
  /* Only the hands the body has; the arrow keys move the last one touched on this frame, else its
     attacking hand, else whichever it has */
  const shownHands = HANDS.filter((which) => hasHandIn(poses, which));
  const wanted = picked && picked.name === name ? picked.hand : getStartHand(frame);
  const hand = shownHands.includes(wanted) ? wanted : (shownHands[0] ?? wanted);
  const poseOf = (which: Hand) => (name ? poses?.[name]?.[which] : undefined);
  const pose = poseOf(hand);

  useEffect(() => {
    let live = true;
    if (!weapon) setImage(null);
    else
      loadSheet(weapon).then((sheet) => {
        if (live) setImage(sheet);
      });
    return () => {
      live = false;
    };
  }, [weapon]);

  /* Where a drag started: the hand, the pointer in preview pixels, and the hand point then */
  const dragStart = useRef<{ hand: Hand; px: number; py: number; x: number; y: number }>(undefined);

  const place = (which: Hand, x: number, y: number, done: boolean) => {
    if (name) onPlace({ frame: name, hand: which, x, y, done });
  };

  /* Arrow keys nudge the point, Shift for bigger steps; a key something else used is left alone */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || isTyping(e.target)) return;
      if (!isActive()) return;
      const offset = getNudgeOffset(e.key, e.shiftKey);
      if (!offset || !pose) return;
      e.preventDefault();
      place(hand, pose.x + offset.x, pose.y + offset.y, true);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  /** The pointer in preview pixels, whatever size the preview is drawn at. */
  const toPreview = (e: PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      px: ((e.clientX - rect.left) * PREVIEW_SIZE) / rect.width,
      py: ((e.clientY - rect.top) * PREVIEW_SIZE) / rect.height,
    };
  };

  /** Where the drag has taken the hand point, in whole pixels. */
  const dragTo = (e: PointerEvent<HTMLElement>) => {
    const start = dragStart.current;
    if (!start) return;
    const { px, py } = toPreview(e);
    return { x: Math.round(start.x + px - start.px), y: Math.round(start.y + py - start.py) };
  };

  const dragHandlers = (which: Hand) => ({
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      const start = poseOf(which);
      if (!start) return;
      setPicked({ name, hand: which });
      e.currentTarget.setPointerCapture(e.pointerId);
      dragStart.current = { hand: which, ...toPreview(e), x: start.x, y: start.y };
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const to = dragTo(e);
      if (to) place(which, to.x, to.y, false);
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => {
      const to = dragTo(e);
      dragStart.current = undefined;
      if (to) place(which, to.x, to.y, true);
    },
  });

  return (
    <>
      {/* What's shown, and how: the frame's name, and the weapon or just its point */}
      <Flex sx={{ alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <FieldHint>{name ?? "This frame has no weapon"}</FieldHint>
        {/* Always there; without a weapon only the points can show, so it's on and locked */}
        <Switch
          label="Point only"
          checked={pointOnly || !weapon}
          disabled={!weapon || !pose}
          onChange={(e) => setPointOnly(e.target.checked)}
        />
      </Flex>
      {notice && <FieldHint>{notice}</FieldHint>}
      {pose && (
        <>
          {/* Both hands at once, side by side; the outlined one is the arrow keys' */}
          <Flex sx={{ gap: 2 }}>
            {shownHands.map((which) => {
              const whichPose = poseOf(which);
              return (
                <Flex
                  key={which}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    flexDirection: "column",
                    gap: 1,
                    outline: which === hand ? "1px solid" : "none",
                    outlineColor: "primary",
                    borderRadius: 2,
                  }}
                >
                  <Text sx={{ fontSize: 0, textAlign: "center" }}>
                    {which} {whichPose && `(${whichPose.x}, ${whichPose.y})`}
                  </Text>
                  {whichPose && (
                    <FramePreview
                      cell={PREVIEW_SIZE}
                      label={`${which} hand preview`}
                      paint={(ctx) =>
                        paintWeaponFrame(ctx, {
                          stack,
                          weapon: image,
                          hand: which,
                          pose: whichPose,
                          frame,
                          cell,
                          size: PREVIEW_SIZE,
                          pointOnly: pointOnly || !weapon,
                        })
                      }
                    >
                      {() => (
                        <Box
                          aria-label={`Drag the ${which} hand's weapon into place`}
                          sx={{
                            position: "absolute",
                            inset: 0,
                            cursor: "move",
                            touchAction: "none",
                          }}
                          {...dragHandlers(which)}
                        />
                      )}
                    </FramePreview>
                  )}
                </Flex>
              );
            })}
          </Flex>
          <Text sx={{ fontSize: 0, textAlign: "center", opacity: 0.7 }}>
            Drag either hand; arrow keys nudge the outlined one, Shift for more
          </Text>
        </>
      )}
      {error && <Text sx={{ fontSize: 0, color: "#ff4d4d" }}>{error}</Text>}
    </>
  );
};

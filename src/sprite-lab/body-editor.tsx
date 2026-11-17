import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import type { BodyShape } from "@/content";
import { Box, Field, Flex, Grid, Input, loadSheet, Text } from "@/ui";
import { dragShape, isHand, nudgeShape, type FeetPoint, type Handle } from "./body-handles";
import { BodyOverlay, HANDLE_COLORS } from "./body-overlay";
import { CHECKER_SX } from "./checker";
import { getNudgeOffset, isTyping } from "./frame-editing";
import { useFrameStack } from "./frame-stack";
import { SignButton } from "./sign-button";
import type { Frame } from "./lab-state";
import type { HumanLayer, Sheet } from "./sheets";
import type { HandPlacement } from "./use-hand-points";
import type { PendingCandidate } from "./use-pending-candidates";
import { getPoseName, HANDS, paintBodyFrame, type WeaponPoses } from "./weapon-pose";

/** Room round the frame, so long weapons and a hit box bigger than the cell still show. */
const MARGIN_SHARE = 0.5;
/** Screen pixels per sprite pixel: whole, so the sprite is never smeared. */
const MAX_ZOOM = 3;
/** The most room the frame takes, so the controls fit beside it; big bodies drop to 1×. */
const PREVIEW_MAX_WIDTH = 380;
/** The animated columns of a body sheet: stand, three walk steps, two attacks. */
const FRAME_COLUMNS = 6;

const HANDLE_NAMES: Record<Handle, string> = {
  top: "hit box top",
  side: "hit box sides",
  feet: "feet",
  head: "head",
  right: "right hand",
  left: "left hand",
};

/** A whole-number field that changes one value; empty or junk input is ignored. */
const NumberField = ({
  label,
  value,
  color,
  onChange,
}: {
  label: string;
  value: number;
  color: string;
  onChange: (value: number) => void;
}) => (
  <Box sx={{ minWidth: 0 }}>
    <Field label={<span style={{ color }}>{label}</span>}>
      <Input
        type="number"
        value={value}
        onChange={(e) => {
          const next = Number.parseInt(e.target.value, 10);
          if (Number.isFinite(next)) onChange(next);
        }}
      />
    </Field>
  </Box>
);

/**
 * The whole body on one frame: its hit box, feet, head and hand points, each dragged where it
 * sits. The last one touched is outlined; the arrow keys nudge it (Shift for more), and `,` and `.`
 * step through the frames. Exact sizes can be typed beside it. `onShape` and `onPlace` hear every
 * move, with `done` once a drag or nudge has finished, so a whole drag is one undo step.
 */
export const BodyEditor = ({
  shape,
  hands,
  onShape,
  onPlace,
  isActive,
  weapon,
  frame,
  onFrame,
  cell,
  base,
  layers,
  pending,
  controls,
  footer,
}: {
  shape: BodyShape;
  hands: WeaponPoses | undefined;
  onShape: (shape: Partial<BodyShape>, done: boolean) => void;
  onPlace: (placement: HandPlacement & { done: boolean }) => void;
  isActive: () => boolean;
  /** The weapon tried in the hands; none shows just the points. */
  weapon: Sheet | undefined;
  frame: Frame;
  onFrame: (frame: Frame) => void;
  cell: number;
  base: Sheet;
  layers: { layer: HumanLayer; sheet: Sheet }[];
  pending: PendingCandidate[];
  /** The window's own controls, shown beside the frame above the sizes. */
  controls: ReactNode;
  /** Under the sizes: errors, undo and save. */
  footer: ReactNode;
}) => {
  const stack = useFrameStack(base, layers, pending);
  const [weaponImage, setWeaponImage] = useState<HTMLCanvasElement | null>(null);
  const [selected, setSelected] = useState<Handle>("top");
  const grabbed = useRef<Handle>(undefined);
  const canvas = useRef<HTMLCanvasElement>(null);
  const size = Math.round(cell * (1 + MARGIN_SHARE));
  /* The sprite sits in the middle; its feet are below that, as the body says */
  const feet = { x: size / 2, y: size / 2 + shape.spriteAboveFeet };
  const zoom = Math.max(1, Math.min(MAX_ZOOM, Math.floor(PREVIEW_MAX_WIDTH / size)));

  const name = getPoseName(frame);
  const framePoses: Partial<WeaponPoses[string]> = (name && hands?.[name]) || {};
  const frameHands = Object.fromEntries(
    HANDS.flatMap((hand) => (framePoses[hand] ? [[hand, framePoses[hand]]] : [])),
  );

  useEffect(() => {
    let live = true;
    if (!weapon) setWeaponImage(null);
    else
      loadSheet(weapon).then((image) => {
        if (live) setWeaponImage(image);
      });
    return () => {
      live = false;
    };
  }, [weapon]);

  /* Drawn at the screen's own resolution with smoothing off, never stretched by the browser */
  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext("2d");
    if (!element || !ctx) return;
    const ratio = window.devicePixelRatio || 1;
    element.width = size * zoom * ratio;
    element.height = size * zoom * ratio;
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(zoom * ratio, 0, 0, zoom * ratio, 0, 0);
    paintBodyFrame(ctx, {
      stack,
      weapon: weaponImage,
      poses: frameHands,
      frame,
      cell,
      size,
      spriteAboveFeet: shape.spriteAboveFeet,
    });
  });

  const stepFrame = (by: number) =>
    onFrame({ ...frame, column: (frame.column + by + FRAME_COLUMNS) % FRAME_COLUMNS });

  /** Moves `handle` to `point` (from the feet), or nudges it there with `nudge`. */
  const move = (handle: Handle, point: FeetPoint, done: boolean, nudge = false) => {
    if (!isHand(handle)) {
      onShape(nudge ? nudgeShape(handle, shape, point) : dragShape(handle, shape, point), done);
      return;
    }
    const pose = framePoses[handle];
    if (!name || !pose) return;
    const to = nudge ? { x: pose.x + point.x, y: pose.y + point.y } : point;
    onPlace({ frame: name, hand: handle, x: Math.round(to.x), y: Math.round(to.y), done });
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || isTyping(e.target)) return;
      if (!isActive()) return;
      if (e.key === "," || e.key === ".") {
        e.preventDefault();
        stepFrame(e.key === "," ? -1 : 1);
        return;
      }
      const offset = getNudgeOffset(e.key, e.shiftKey);
      if (!offset) return;
      e.preventDefault();
      move(selected, offset, true, true);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  /** The pointer, in sprite pixels from the feet. */
  const toFeet = (e: PointerEvent<HTMLElement>): FeetPoint => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * size) / rect.width - feet.x,
      y: ((e.clientY - rect.top) * size) / rect.height - feet.y,
    };
  };

  const follow = (e: PointerEvent<HTMLElement>, done: boolean) => {
    const handle = grabbed.current;
    if (!handle) return;
    move(handle, toFeet(e), done);
    if (done) grabbed.current = undefined;
  };

  const hitBox = shape.hitBox;
  return (
    <Flex sx={{ gap: 3, alignItems: "flex-start" }}>
      {/* The frame, with stepping under it */}
      <Flex sx={{ flexDirection: "column", gap: 1, width: size * zoom, flexShrink: 0 }}>
        <Box
          sx={{
            ...CHECKER_SX,
            position: "relative",
            width: size * zoom,
            height: size * zoom,
            borderRadius: 2,
            overflow: "hidden",
            touchAction: "none",
          }}
          onPointerMove={(e) => follow(e, false)}
          onPointerUp={(e) => follow(e, true)}
          onPointerCancel={(e) => follow(e, true)}
        >
          <canvas
            ref={canvas}
            aria-label="Body preview"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          />
          <BodyOverlay
            shape={shape}
            hands={frameHands}
            feet={feet}
            size={size}
            zoom={zoom}
            selected={selected}
            onGrab={(handle, e) => {
              const frameBox = e.currentTarget.ownerSVGElement?.parentElement;
              frameBox?.setPointerCapture(e.pointerId);
              grabbed.current = handle;
              setSelected(handle);
            }}
          />
        </Box>
        <Flex sx={{ alignItems: "center", gap: 1 }}>
          <SignButton sign="left" label="Previous frame (,)" onClick={() => stepFrame(-1)} />
          <Text sx={{ flex: 1, fontSize: 0, textAlign: "center", opacity: 0.7 }}>
            {HANDLE_NAMES[selected]}: drag, arrows nudge
          </Text>
          <SignButton sign="right" label="Next frame (.)" onClick={() => stepFrame(1)} />
        </Flex>
      </Flex>
      {/* Everything else, beside it, so the window stays short */}
      <Flex
        sx={{ flex: 1, minWidth: 0, flexDirection: "column", gap: 2, "& > *": { flexShrink: 0 } }}
      >
        {controls}
        <Grid sx={{ gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <NumberField
            label="width"
            value={hitBox.width}
            color={HANDLE_COLORS.box}
            onChange={(width) =>
              onShape({ hitBox: { ...hitBox, width: Math.max(1, width) } }, true)
            }
          />
          <NumberField
            label="height"
            value={hitBox.height}
            color={HANDLE_COLORS.box}
            onChange={(height) =>
              onShape({ hitBox: { ...hitBox, height: Math.max(1, height) } }, true)
            }
          />
          <NumberField
            label="feet"
            value={shape.feetRadius}
            color={HANDLE_COLORS.feet}
            onChange={(feetRadius) => onShape({ feetRadius: Math.max(1, feetRadius) }, true)}
          />
          <NumberField
            label="head"
            value={shape.headY}
            color={HANDLE_COLORS.head}
            onChange={(headY) => onShape({ headY: Math.min(0, headY) }, true)}
          />
          <NumberField
            label="feet below sprite"
            value={shape.spriteAboveFeet}
            color={HANDLE_COLORS.feet}
            onChange={(spriteAboveFeet) => onShape({ spriteAboveFeet }, true)}
          />
        </Grid>
        {footer}
      </Flex>
    </Flex>
  );
};

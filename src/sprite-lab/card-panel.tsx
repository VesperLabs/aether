import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  Box,
  Button,
  DIRECTIONS,
  FieldHint,
  Flex,
  Input,
  Select,
  SliderField,
  Swatch,
  Text,
} from "@/ui";
import {
  CARD_BACKDROP_NAMES,
  CARD_BACKDROPS,
  CARD_ICON_SIZE,
  type CardBackdrop,
  CARD_SIZE,
  cutDiamond,
  FACE_SIZE,
  isCardBackdrop,
  isInDiamond,
  paintCard,
  type FaceRect,
} from "./card-face";
import { CHECKER_SX } from "./checker";
import { FloatingPanel } from "./floating-panel";
import { getCtx } from "./frame-canvas";
import { sortForDirection, useFrameStack } from "./frame-stack";
import { saveCard } from "./generations-api";
import type { Frame } from "./lab-state";
import type { HumanLayer, Sheet } from "./sheets";
import type { PendingCandidate } from "./use-pending-candidates";

const START_POSITION = { x: 440, y: 120 };
const PANEL_WIDTH = 300;
const VIEW_SIZE = 260;
const CARD_ZOOM = 4;
const CARD_VIEW_SIZE = 140;
const OUTLINE_COLOR = "#ff4df0";
const NUDGE_FAR = 4;
const NAME_PATTERN = /^[a-z0-9-]+$/;

const CANVAS_SX = {
  display: "block",
  width: "100%",
  imageRendering: "pixelated",
  borderRadius: 2,
  ...CHECKER_SX,
} as const;

/** Where a sprite's face was cut from, and the backdrop its card was saved with. */
type SavedFace = FaceRect & { backdrop?: string };

/** The remembered face for each sprite, from `faces.json`. Empty if none has been saved yet. */
const useSavedFaces = (revision: number) => {
  const [faces, setFaces] = useState<Record<string, SavedFace>>({});
  useEffect(() => {
    fetch(`/assets/cards/faces.json?v=${revision}`)
      .then((response) => response.json())
      .then(setFaces)
      .catch(() => setFaces({}));
  }, [revision]);
  return faces;
};

/** Just the face's place, without the backdrop it was saved with. */
const pickFaceRect = (saved?: SavedFace): FaceRect | undefined =>
  saved && { x: saved.x, y: saved.y, size: FACE_SIZE };

/** Marks the diamond on the frame, so it's clear what the card will cut. */
const paintOutline = (ctx: CanvasRenderingContext2D, { x, y, size }: FaceRect) => {
  ctx.fillStyle = OUTLINE_COLOR;
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const isEdge =
        isInDiamond(px, py, size) &&
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx, dy]) => !isInDiamond(px + dx, py + dy, size));
      if (isEdge) ctx.fillRect(x + px, y + py, 1, 1);
    }
  }
};

/**
 * Marks a sprite's face on the selected frame, previews the card cut from it,
 * and saves the diamond as a PNG. Layers are included, so a helmet or hair is part of the card.
 */
export const CardPanel = ({
  defaultName,
  base,
  layers,
  pending,
  frame,
  cell,
  onClose,
}: {
  /** The name the card saves under until it's changed: the NPC's id, or the body's. */
  defaultName: string;
  base: Sheet;
  layers: { layer: HumanLayer; sheet: Sheet }[];
  pending: PendingCandidate[];
  frame: Frame;
  cell: number;
  onClose?: () => void;
}) => {
  const stack = useFrameStack(base, layers, pending);
  const [savedRevision, setSavedRevision] = useState(0);
  const savedFaces = useSavedFaces(savedRevision);
  const [pickedBackdrop, setPickedBackdrop] = useState<{
    texture: string;
    backdrop: CardBackdrop;
  }>();
  const savedBackdrop = savedFaces[base.texture]?.backdrop;
  /* Each sprite keeps its own backdrop, like its face. */
  const backdrop =
    pickedBackdrop?.texture === base.texture
      ? pickedBackdrop.backdrop
      : isCardBackdrop(savedBackdrop)
        ? savedBackdrop
        : "night";
  const [picked, setPicked] = useState<{ texture: string; face: FaceRect }>();
  const [name, setName] = useState(defaultName);
  const [status, setStatus] = useState<string>();
  const viewRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLCanvasElement>(null);

  /* Each sprite keeps its own face; one not marked yet starts in the upper middle of the frame. */
  const face = useMemo<FaceRect>(
    () =>
      picked?.texture === base.texture
        ? picked.face
        : (pickFaceRect(savedFaces[base.texture]) ?? {
            size: FACE_SIZE,
            x: Math.round((cell - FACE_SIZE) / 2),
            y: Math.round(cell * 0.2),
          }),
    [picked, savedFaces, base.texture, cell],
  );
  const setFace = (next: Partial<FaceRect>) =>
    setPicked({ texture: base.texture, face: { ...face, ...next } });

  const composite = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = cell;
    canvas.height = cell;
    const ctx = getCtx(canvas);
    sortForDirection(DIRECTIONS[frame.row], stack).forEach(({ image }) => {
      ctx.drawImage(image, frame.column * cell, frame.row * cell, cell, cell, 0, 0, cell, cell);
    });
    return canvas;
  }, [stack, frame, cell]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.width = cell;
    view.height = cell;
    const ctx = getCtx(view);
    ctx.drawImage(composite, 0, 0);
    paintOutline(ctx, face);
  }, [composite, face, cell]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const edge = CARD_SIZE;
    card.width = edge;
    card.height = edge;
    const ctx = getCtx(card);
    ctx.clearRect(0, 0, edge, edge);
    paintCard(ctx, cutDiamond(composite, face), backdrop);
  }, [composite, face, backdrop]);

  /* Dragging carries the face with the pointer; a click centres it on the spot. */
  const place = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = cell / rect.width;
    setFace({
      x: Math.round((e.clientX - rect.left) * scale - face.size / 2),
      y: Math.round((e.clientY - rect.top) * scale - face.size / 2),
    });
  };
  const drag = (e: PointerEvent<HTMLDivElement>) => {
    if (e.buttons) place(e);
  };
  const nudge = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? NUDGE_FAR : 1;
    const moves: Record<string, [number, number]> = {
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    setFace({ x: face.x + move[0], y: face.y + move[1] });
  };

  const isNameValid = NAME_PATTERN.test(name);
  /* The whole card is saved, frame and backdrop included, so the game draws it as is. */
  const save = async () => {
    try {
      const card = document.createElement("canvas");
      card.width = CARD_ICON_SIZE;
      card.height = CARD_ICON_SIZE;
      const ctx = getCtx(card);
      const margin = (CARD_ICON_SIZE - CARD_SIZE) / 2;
      ctx.translate(margin, margin);
      paintCard(ctx, cutDiamond(composite, face), backdrop);
      await saveCard({ name, texture: base.texture, face, backdrop, image: card });
      setSavedRevision((revision) => revision + 1);
      setStatus(`Saved assets/cards/${name}.png`);
    } catch (failure) {
      setStatus(failure instanceof Error ? failure.message : "Save failed");
    }
  };

  return (
    <FloatingPanel
      id="card"
      title={<Text sx={{ fontWeight: "bold" }}>Monster card</Text>}
      width={PANEL_WIDTH}
      start={START_POSITION}
      onClose={onClose}
    >
      <FieldHint>
        Drag on the frame to place the face. Arrow keys nudge it, shift for more.
      </FieldHint>
      <Box
        as="canvas"
        ref={viewRef}
        aria-label="Face position"
        tabIndex={0}
        onPointerDown={place}
        onPointerMove={drag}
        onKeyDown={nudge}
        sx={{ ...CANVAS_SX, width: VIEW_SIZE, alignSelf: "center", cursor: "crosshair" }}
      />
      <SliderField
        label="Face X"
        value={face.x}
        min={-Math.floor(face.size / 2)}
        max={cell - Math.ceil(face.size / 2)}
        onChange={(x) => setFace({ x })}
      />
      <SliderField
        label="Face Y"
        value={face.y}
        min={-Math.floor(face.size / 2)}
        max={cell - Math.ceil(face.size / 2)}
        onChange={(y) => setFace({ y })}
      />
      <Select
        label="Background"
        value={backdrop}
        options={CARD_BACKDROP_NAMES.map((option) => ({
          value: option,
          label: option,
          icon: <Swatch color={CARD_BACKDROPS[option].glow} />,
        }))}
        onChange={(option) =>
          setPickedBackdrop({ texture: base.texture, backdrop: option as CardBackdrop })
        }
      />
      {/* A stand of one size, so the panel never jumps; the card sits in it at a whole-number zoom
          to keep its pixels square and its border 1px at that zoom. */}
      <Flex
        sx={{
          ...CHECKER_SX,
          width: CARD_VIEW_SIZE,
          height: CARD_VIEW_SIZE,
          alignSelf: "center",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 2,
        }}
      >
        <Box
          as="canvas"
          ref={cardRef}
          aria-label="Card preview"
          sx={{
            width: CARD_SIZE * CARD_ZOOM,
            imageRendering: "pixelated",
          }}
        />
      </Flex>
      <Input
        aria-label="Card name"
        value={name}
        onChange={(e) => setName(e.target.value.toLowerCase())}
      />
      <Button variant="control" disabled={!isNameValid} onClick={save}>
        Save card
      </Button>
      {status && <Text sx={{ fontSize: 0 }}>{status}</Text>}
    </FloatingPanel>
  );
};

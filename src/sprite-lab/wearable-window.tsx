import { useEffect, useMemo, useState } from "react";
import { Box, Button, DIRECTIONS, Flex, loadSheet, Select, Text } from "@/ui";
import { encodeDrawImages } from "./draw-frame";
import { DRAW_MODELS } from "./draw-models";
import { findHands, type HandLabel } from "./hand-guide";
import { fillWearablePrompt } from "./draw-prompts";
import { FloatingPanel } from "./floating-panel";
import { cropFrame, paintFrameStack, withPending, type StackedSheet } from "./frame-stack";
import { getThumbSx } from "./generation-list";
import { AdditionsField } from "./prompt-fields";
import type { Frame } from "./lab-state";
import { fitsGender, getLayerSheets, HUMAN_LAYERS, type HumanLayer, type Sheet } from "./sheets";
import type { PendingCandidate } from "./use-pending-candidates";
import { WINDOW_WIDTH } from "./window-layout";

const LABEL_SX = { fontSize: 0, opacity: 0.5 };
const CLOTHING_OPTIONS = HUMAN_LAYERS.filter((layer) => layer !== "shadow").flatMap(getLayerSheets);
/** Gloves are only hands, so any pair says where the hands are on every frame. */
const [GLOVES] = getLayerSheets("gloves");

/** What a wearable draw is built from: the body to fit, and one sheet to show from every side. */
export type WearableInputs = {
  body: HTMLCanvasElement;
  views: HTMLCanvasElement;
  /** The design on the body, one standing frame per row. */
  wornViews: HTMLCanvasElement;
  /** Which hand is which on this frame. */
  hands: HandLabel[];
  /** The layer the design belongs to, to say what it is. */
  layer?: string;
};

/** Human plus chest for this frame, the body everything is fitted to. */
const getBody = (stack: StackedSheet[], frame: Frame, cell: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = cell;
  canvas.height = cell;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const body = stack.filter(({ layer }) => layer === "skin" || layer === "chest");
  paintFrameStack(ctx, body, frame, cell, "", () => {});
  return canvas;
};

/** The design on the body from every side, so the model sees what it covers and what stays bare. */
const getWornViews = (
  stack: StackedSheet[],
  sheet: Sheet,
  views: HTMLCanvasElement,
  cell: number,
  layer: HumanLayer = "chest",
) => {
  const canvas = document.createElement("canvas");
  canvas.width = cell;
  canvas.height = cell * DIRECTIONS.length;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const body = stack.filter(
    (item) => (item.layer === "skin" || item.layer === "chest") && item.src !== sheet.src,
  );
  const worn = [...body, { layer, src: sheet.src, image: views }];
  DIRECTIONS.forEach((_, row) => {
    ctx.setTransform(1, 0, 0, 1, 0, row * cell);
    paintFrameStack(ctx, worn, { column: 0, row }, cell, "", () => {});
  });
  return canvas;
};

/** One image exactly as it's sent. */
const SentImage = ({ label, src, wide }: { label: string; src?: string; wide?: boolean }) => (
  <Flex sx={{ flexDirection: "column", gap: 1, flex: 1, minWidth: 0 }}>
    <Text sx={LABEL_SX}>{label}</Text>
    {src && (
      <Box
        as="img"
        {...{ src, alt: label }}
        sx={{ ...getThumbSx(false), aspectRatio: wide ? "4" : "1", cursor: "default" }}
      />
    )}
  </Flex>
);

/** A button that opens the wearable draw: fit one sheet's design to this frame's body. */
export const WearableWindow = ({
  cell,
  frame,
  stack,
  target,
  source,
  sheetTexture,
  gender,
  pending,
  model,
  prompt,
  drawing,
  onSheet,
  onModel,
  onPrompt,
  onDraw,
}: {
  cell: number;
  frame: Frame;
  stack: StackedSheet[];
  /** The sheet being edited, used for the design until another is picked. */
  target: Sheet;
  /** The work so far, sent first. */
  source: HTMLCanvasElement;
  sheetTexture: string;
  /** The chest's gender, which narrows the clothing list. */
  gender?: string;
  pending: PendingCandidate[];
  model: string;
  prompt: string;
  drawing: boolean;
  onSheet: (texture: string) => void;
  onModel: (model: string) => void;
  onPrompt: (prompt: string) => void;
  onDraw: (inputs: WearableInputs) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [views, setViews] = useState<HTMLCanvasElement>();
  const [gloves, setGloves] = useState<HTMLCanvasElement>();
  const options = CLOTHING_OPTIONS.filter(({ texture }) => fitsGender(texture, gender));
  const sheet = options.find(({ texture }) => texture === sheetTexture) ?? target;
  const layer = HUMAN_LAYERS.find((option) =>
    getLayerSheets(option).some(({ src }) => src === sheet.src),
  );

  useEffect(() => {
    let live = true;
    loadSheet(sheet).then((image) => {
      if (live && image) setViews(withPending(sheet, image, pending));
    });
    return () => {
      live = false;
    };
  }, [sheet, pending]);

  useEffect(() => {
    loadSheet(GLOVES).then((image) => image && setGloves(image));
  }, []);

  const body = useMemo(() => getBody(stack, frame, cell), [stack, frame, cell]);
  const worn = open && views ? getWornViews(stack, sheet, views, cell, layer) : undefined;
  /* Built by the draw's own code on every render, so this can't differ from what gets sent. */
  const hands = gloves
    ? findHands(
        (cropFrame(gloves, frame, cell).getContext("2d") as CanvasRenderingContext2D).getImageData(
          0,
          0,
          cell,
          cell,
        ).data,
        cell,
        frame,
      )
    : undefined;
  const [workUrl, exampleUrl, bodyUrl, guideUrl] = worn
    ? encodeDrawImages(source, { column: 0, row: 0 }, cell, worn, body, hands).map(
        (image) => `data:image/png;base64,${image}`,
      )
    : [];

  return (
    <>
      <Button
        variant="wood"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        sx={{ flex: 1, justifyContent: "center" }}
      >
        Wearable
      </Button>
      {open && (
        <FloatingPanel
          id="wearable"
          title={<Text sx={{ fontWeight: "bold" }}>Wearable</Text>}
          width={WINDOW_WIDTH}
          start={{ x: window.innerWidth - (WINDOW_WIDTH + 16) * 2, y: 48 }}
          onClose={() => setOpen(false)}
        >
          <Text sx={LABEL_SX}>Sent to Gemini</Text>
          <Flex sx={{ gap: 2 }}>
            <SentImage label="1. Work so far" src={workUrl} />
            <SentImage label="3. Body" src={bodyUrl} />
            <SentImage label="4. Hands" src={guideUrl} />
          </Flex>
          <SentImage label="2. Example" src={exampleUrl} wide />
          <Box
            as="pre"
            sx={{
              m: 0,
              maxHeight: 120,
              overflowY: "auto",
              fontFamily: "inherit",
              fontSize: 0,
              opacity: 0.7,
              whiteSpace: "pre-wrap",
            }}
          >
            {fillWearablePrompt(frame, prompt, layer)}
          </Box>
          <Select
            label="Clothing to copy"
            value={sheet.texture}
            options={options.map(({ texture }) => ({ value: texture, label: texture }))}
            onChange={onSheet}
          />
          <Select label="Model" value={model} options={DRAW_MODELS} onChange={onModel} />
          <AdditionsField value={prompt} onChange={onPrompt} />
          <Button
            variant="wood"
            disabled={drawing || !worn || !hands}
            onClick={() =>
              views && worn && hands && onDraw({ body, views, wornViews: worn, hands, layer })
            }
            sx={{ justifyContent: "center", flexShrink: 0 }}
          >
            {drawing ? "Drawing..." : "Draw wearable"}
          </Button>
        </FloatingPanel>
      )}
    </>
  );
};

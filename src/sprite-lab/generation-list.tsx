import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Box, Flex, Text } from "@/ui";
import {
  deleteGeneration,
  flipGeneration,
  getGenerationUrl,
  mergeGeneration,
  type Generation,
} from "./generations-api";
import { CHECKER_SX } from "./checker";
import { DRAW_MODELS, HAND_DRAWN_MODEL, OVERWRITTEN_MODEL } from "./draw-models";
import { FloatingPanel } from "./floating-panel";
import { WINDOW_WIDTH } from "./window-layout";
import { clearOpenCandidate, getFrameKey } from "./open-candidates";

const COLUMNS = 4;
/** Marks the Original tile, so a drag can tell it landed there. */
export const ORIGINAL_TILE_ATTR = "data-original-tile";
const PROMPT_BUTTON_SIZE = 14;
const LABEL_SX = { fontSize: 0, opacity: 0.5 };
const TILE_BUTTON_SX = {
  position: "absolute",
  top: "2px",
  right: "2px",
  width: PROMPT_BUTTON_SIZE,
  height: PROMPT_BUTTON_SIZE,
  p: 0,
  border: "none",
  borderRadius: "50%",
  fontSize: 0,
  lineHeight: 1,
  color: "white",
  cursor: "pointer",
  bg: "rgba(0, 0, 0, 0.65)",
} as const;

const { right: _right, ...TILE_BUTTON_BASE_SX } = TILE_BUTTON_SX;
const DELETE_BUTTON_SX = { ...TILE_BUTTON_BASE_SX, left: "2px", color: "#ff4d4d" } as const;

const { top: _flipTop, ...FLIP_BASE_SX } = TILE_BUTTON_BASE_SX;
/** The second flip button sits this far along, just past the first. */
const FLIP_STEP = 16;

/** Mirrors a draw, shown by a small double-headed arrow along that axis. */
const FlipButton = ({ axis, onClick }: { axis: "x" | "y"; onClick: () => void }) => (
  <Box
    as="button"
    {...{
      type: "button",
      "aria-label": axis === "x" ? "Flip horizontally" : "Flip vertically",
      title: axis === "x" ? "Flip horizontally" : "Flip vertically",
    }}
    onClick={onClick}
    sx={{
      ...FLIP_BASE_SX,
      left: axis === "x" ? "2px" : `${2 + FLIP_STEP}px`,
      bottom: "2px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <svg
      aria-hidden
      viewBox="0 0 8 8"
      width={8}
      height={8}
      fill="none"
      style={{ transform: axis === "y" ? "rotate(90deg)" : undefined }}
    >
      <path
        d="M1 4 H7 M2.8 2.2 L1 4 L2.8 5.8 M5.2 2.2 L7 4 L5.2 5.8"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </Box>
);

/** Sits at the bottom on a candidate, whose top right is its info button. */
const DuplicateButton = ({
  corner,
  onClick,
}: {
  corner: "top" | "bottom";
  onClick: () => void;
}) => {
  const { top: _top, ...sx } = TILE_BUTTON_SX;
  return (
    <Box
      as="button"
      {...{
        type: "button",
        "aria-label": "New candidate from this",
        title: "New candidate from this",
      }}
      onClick={onClick}
      sx={{ ...sx, ...(corner === "top" ? { top: "2px" } : { bottom: "2px" }) }}
    >
      +
    </Box>
  );
};

export const getThumbSx = (selected: boolean) =>
  ({
    display: "block",
    width: "100%",
    aspectRatio: "1",
    imageRendering: "pixelated",
    cursor: "pointer",
    borderRadius: 2,
    outline: selected ? "2px solid white" : "none",
    ...CHECKER_SX,
  }) as const;

/** A draw's prompt and what can be done with it, over the list so its scrolling can't clip it. */
const CandidatePopover = ({
  generation,
  onClose,
}: {
  generation: Generation;
  onClose: () => void;
}) => {
  const modelLabel =
    generation.model === HAND_DRAWN_MODEL
      ? "Copy of the sheet"
      : generation.model === OVERWRITTEN_MODEL
        ? "Replaced by a merge"
        : (DRAW_MODELS.find(({ value }) => value === generation.model)?.label ?? generation.model);

  return (
    <FloatingPanel
      id="candidate"
      title={
        <Text
          sx={{
            fontWeight: "bold",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {modelLabel}
        </Text>
      }
      width={WINDOW_WIDTH}
      start={{ x: window.innerWidth - (WINDOW_WIDTH + 16) * 2, y: 140 }}
      onClose={onClose}
    >
      {generation.prompt && (
        <Flex sx={{ flexDirection: "column", gap: 1 }}>
          <Text sx={LABEL_SX}>Your additions</Text>
          <Text sx={{ fontSize: 1, lineHeight: 1.35, overflowWrap: "anywhere" }}>
            {generation.prompt}
          </Text>
        </Flex>
      )}
      {generation.fullPrompt && (
        <Flex sx={{ flexDirection: "column", gap: 1 }}>
          <Text sx={LABEL_SX}>Sent to Gemini</Text>
          <Text
            sx={{
              display: "block",
              /* The recessed look of the form inputs. */
              bg: "rgba(0, 0, 0, 0.38)",
              border: "1px solid rgba(0, 0, 0, 0.35)",
              maxHeight: 140,
              overflowY: "auto",
              p: 2,
              borderRadius: 4,
              fontSize: 0,
              lineHeight: 1.4,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            }}
          >
            {generation.fullPrompt}
          </Text>
        </Flex>
      )}
    </FloatingPanel>
  );
};

/** The sheet's own frame and the saved draws for it, as thumbnails to pick from. */
export const GenerationList = ({
  generations,
  selectedId,
  originalUrl,
  onSelect,
  onSelectOriginal,
  onDragStart,
  onDragOriginal,
  onDuplicateOriginal,
  onNudgeOriginal,
  onDuplicate,
  onFlipped,
  onDeleted,
  onError,
}: {
  generations: Generation[];
  /** Nothing selected means the original is. */
  selectedId?: string;
  originalUrl?: string;
  onSelect: (generation: Generation) => void;
  onSelectOriginal: () => void;
  /** Given what to do if it lands on the Original tile: merge it into the sheet. */
  onDragStart: (generation: Generation, e: PointerEvent, merge: () => void) => void;
  onDragOriginal: (e: PointerEvent) => void;
  onDuplicateOriginal: () => void;
  onNudgeOriginal: () => void;
  onDuplicate: (generation: Generation) => void;
  onFlipped: (generation: Generation) => void;
  onDeleted: (generation: Generation) => void;
  onError: (message: string) => void;
}) => {
  const [promptId, setPromptId] = useState<string>();
  const promptShown = generations.find(({ id }) => id === promptId);

  const handleMerge = async (generation: Generation) => {
    try {
      await mergeGeneration(generation);
      clearOpenCandidate(getFrameKey(generation.src, generation.frame));
      /* It lives on the sheet now, and what it replaced was kept as a candidate. */
      await deleteGeneration(generation);
      /* The URL keeps the lab's state; a reload picks up the changed sheet. */
      window.location.reload();
    } catch (failure) {
      onError(failure instanceof Error ? failure.message : "Merge failed");
    }
  };

  const handleFlip = async (generation: Generation, axis: "x" | "y") => {
    try {
      onFlipped(await flipGeneration(generation, axis));
    } catch (failure) {
      onError(failure instanceof Error ? failure.message : "Flip failed");
    }
  };

  const handleDelete = async (generation: Generation) => {
    if (!window.confirm("Delete this draw?")) return;
    await deleteGeneration(generation);
    onDeleted(generation);
  };
  const closePrompt = useCallback(() => setPromptId(undefined), []);
  const selectedRef = useRef<HTMLDivElement>(null);

  /* A new draw lands at the end of the list, which may be scrolled out of view. */
  useEffect(() => {
    selectedRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [selectedId, generations.length]);

  return (
    <Box sx={{ position: "relative", flexShrink: 0 }}>
      {promptShown && (
        <CandidatePopover key={promptShown.id} generation={promptShown} onClose={closePrompt} />
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
          gap: 2,
          maxHeight: 200,
          /* Keeps the selected thumbnail's outline from being cut off at the edges. */
          p: "2px",
          overflowY: "auto",
        }}
      >
        {originalUrl && (
          <Box {...{ [ORIGINAL_TILE_ATTR]: true }} sx={{ position: "relative" }}>
            <Box
              as="img"
              {...{ src: originalUrl, alt: "Original", draggable: false }}
              onPointerDown={onDragOriginal}
              onClick={onSelectOriginal}
              sx={getThumbSx(!selectedId)}
            />
            <DuplicateButton corner="top" onClick={onDuplicateOriginal} />
            <Box
              as="button"
              {...{
                type: "button",
                "aria-label": "Nudge this frame on every sheet",
                title: "Nudge this frame on every sheet",
              }}
              onClick={onNudgeOriginal}
              sx={{ ...TILE_BUTTON_BASE_SX, left: "2px" }}
            >
              {/* Like the flip arrows, but diagonal: it moves the art rather than mirroring it. */}
              <svg
                aria-hidden
                viewBox="0 0 8 8"
                width={8}
                height={8}
                fill="none"
                style={{ display: "block", margin: "auto" }}
              >
                <path
                  d="M1.5 6.5 L6.5 1.5 M3.8 1.5 H6.5 V4.2 M1.5 3.8 V6.5 H4.2"
                  stroke="currentColor"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Box>
            <Text
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                py: "1px",
                fontSize: 0,
                textAlign: "center",
                pointerEvents: "none",
                bg: "rgba(0, 0, 0, 0.65)",
                borderBottomLeftRadius: 2,
                borderBottomRightRadius: 2,
              }}
            >
              Original
            </Text>
          </Box>
        )}
        {generations.map((generation) => (
          <Box
            key={generation.id}
            ref={generation.id === selectedId ? selectedRef : undefined}
            sx={{ position: "relative" }}
          >
            <Box
              as="img"
              {...{
                src: getGenerationUrl(generation),
                alt: generation.prompt,
                title: generation.prompt,
                /* The browser's own image drag would swallow the pointer events. */
                draggable: false,
              }}
              onPointerDown={(e) => onDragStart(generation, e, () => handleMerge(generation))}
              onClick={() => onSelect(generation)}
              sx={getThumbSx(generation.id === selectedId)}
            />
            <Box
              as="button"
              {...{
                type: "button",
                "aria-label": "View prompt",
                title: "View prompt",
              }}
              onClick={() => setPromptId(promptId === generation.id ? undefined : generation.id)}
              sx={TILE_BUTTON_SX}
            >
              i
            </Box>
            <FlipButton axis="x" onClick={() => handleFlip(generation, "x")} />
            <FlipButton axis="y" onClick={() => handleFlip(generation, "y")} />
            <DuplicateButton corner="bottom" onClick={() => onDuplicate(generation)} />
            <Box
              as="button"
              {...{ type: "button", "aria-label": "Delete draw", title: "Delete draw" }}
              onClick={() => handleDelete(generation)}
              sx={DELETE_BUTTON_SX}
            >
              ×
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

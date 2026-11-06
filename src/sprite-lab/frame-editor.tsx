import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Box } from "@/ui";
import { AdjustPanel } from "./adjust-panel";
import { CHECKER_SX } from "./checker";
import { EditToolbar, type EditTool } from "./edit-toolbar";
import { cropArea, flipCanvas, getCtx, rotateCanvas } from "./frame-canvas";
import {
  getLinePixels,
  getNudgeOffset,
  getRectBetween,
  isInRect,
  isTyping,
  toHexColor,
  type PixelRect,
} from "./frame-editing";
import { useFrameAdjust } from "./use-frame-adjust";

/** What a press on the frame is in the middle of. */
type Stroke =
  | { kind: "pencil"; x: number; y: number }
  | { kind: "eraser"; x: number; y: number }
  | { kind: "select"; x: number; y: number }
  | { kind: "move"; x: number; y: number; fromX: number; fromY: number };

/**
 * Pixels picked up off the frame. The frame always shows them in place, but they stay separate until
 * dropped, so they can slide off the edge and back, or over other art, without losing anything.
 */
type Float = { under: ImageData; lifted: HTMLCanvasElement; x: number; y: number };

/** What was last copied. Outside the editor, so it can be pasted into another draw. */
const clipboard: { current?: { image: HTMLCanvasElement; x: number; y: number } } = {};

/**
 * Move, pencil, eyedropper, marquee, flips and turns for the open draw. A chosen tool takes the pointer over the
 * preview. Every edit saves itself. Arrow keys nudge the selection, or the whole frame without one;
 * the usual shortcuts copy, cut and paste.
 */
export const FrameEditor = ({
  canvas,
  frameId,
  saveImage,
  active,
  renderFrame,
  onSaved,
  onError,
}: {
  /** The open draw, changed in place. */
  canvas: HTMLCanvasElement;
  frameId: string;
  saveImage: (canvas: HTMLCanvasElement) => Promise<unknown>;
  /** Tools only appear and work while this is on: the preview in its big window. */
  active: boolean;
  /** Paints the draw for viewing, perhaps with the rest of the character around it. */
  renderFrame: (ctx: CanvasRenderingContext2D, draw: HTMLCanvasElement) => void;
  onSaved: () => void;
  onError: (message: string) => void;
}) => {
  const viewRef = useRef<HTMLCanvasElement>(null);
  const [chosenTool, setTool] = useState<EditTool>();
  const tool = active ? chosenTool : undefined;
  const [color, setColor] = useState("#000000");
  const [selection, setSelection] = useState<PixelRect>();
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const stroke = useRef<Stroke>(undefined);
  const before = useRef<ImageData>(undefined);
  const float = useRef<Float>(undefined);
  /* The frame as it was when the arrow went down: holding one is a single edit, saved on release. */
  const beforeNudge = useRef<ImageData>(undefined);
  /* Saves run one at a time, so the last edit is always the one left on disk. */
  const saving = useRef(Promise.resolve());

  const paintView = () => {
    const view = viewRef.current;
    if (!view) return;
    const ctx = getCtx(view);
    ctx.clearRect(0, 0, view.width, view.height);
    renderFrame(ctx, canvas);
  };

  useEffect(paintView);

  useEffect(() => {
    setUndoStack([]);
    setSelection(undefined);
    float.current = undefined;
    beforeNudge.current = undefined;
  }, [frameId]);

  const save = () => {
    saving.current = saving.current
      .then(() => saveImage(canvas))
      .then(onSaved)
      .catch((failure) => onError(failure instanceof Error ? failure.message : "Save failed"));
  };

  const snapshot = () => getCtx(canvas).getImageData(0, 0, canvas.width, canvas.height);

  const commit = (previous: ImageData) => {
    setUndoStack((stack) => [...stack, previous]);
    paintView();
    save();
  };

  const handleUndo = () => {
    const previous = undoStack.at(-1);
    if (!previous) return;
    getCtx(canvas).putImageData(previous, 0, 0);
    float.current = undefined;
    beforeNudge.current = undefined;
    setUndoStack((stack) => stack.slice(0, -1));
    setSelection(undefined);
    paintView();
    save();
  };

  const adjust = useFrameAdjust({
    active,
    frameId,
    selection,
    snapshot,
    restore: (image) => {
      getCtx(canvas).putImageData(image, 0, 0);
      paintView();
    },
    commit,
    /* The pixels stay put from here, so a float would bring back the unadjusted ones. */
    onStart: () => {
      float.current = undefined;
    },
  });

  const toggleAdjust = () => {
    if (adjust.open) return adjust.cancel();
    if (!tool) setTool("marquee");
    adjust.start();
  };

  const clearSelection = () => {
    if (!selection) return;
    const previous = snapshot();
    const ctx = getCtx(canvas);
    if (float.current) ctx.putImageData(float.current.under, 0, 0);
    else ctx.clearRect(selection.x, selection.y, selection.width, selection.height);
    float.current = undefined;
    commit(previous);
  };

  const getWorkArea = () => selection ?? { x: 0, y: 0, width: canvas.width, height: canvas.height };

  const liftArea = (rect: PixelRect) => {
    const lifted = cropArea(canvas, rect);
    const ctx = getCtx(canvas);
    ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
    const under = snapshot();
    ctx.drawImage(lifted, rect.x, rect.y);
    return { under, lifted, x: rect.x, y: rect.y };
  };

  const placeFloat = (x: number, y: number) => {
    const current = float.current;
    if (!current) return;
    float.current = { ...current, x, y };
    const ctx = getCtx(canvas);
    ctx.putImageData(current.under, 0, 0);
    ctx.drawImage(current.lifted, x, y);
    setSelection((rect) => rect && { ...rect, x, y });
    paintView();
  };

  const nudge = (dx: number, dy: number) => {
    beforeNudge.current ??= snapshot();
    float.current ??= liftArea(getWorkArea());
    if (!tool) setTool("marquee");
    placeFloat(float.current.x + dx, float.current.y + dy);
  };

  /** Flips or turns the selection, or the frame without one, about its middle, free to move. */
  const transform = (change: (image: HTMLCanvasElement) => HTMLCanvasElement) => {
    if (adjust.isPending()) return;
    const previous = snapshot();
    const current = float.current ?? liftArea(getWorkArea());
    const lifted = change(current.lifted);
    const shrink = current.lifted.width - lifted.width;
    float.current = { ...current, lifted };
    setSelection((rect) => rect && { ...rect, width: lifted.width, height: lifted.height });
    if (!tool) setTool("move");
    placeFloat(current.x + Math.floor(shrink / 2), current.y - Math.ceil(shrink / 2));
    commit(previous);
  };

  const finishNudge = () => {
    if (beforeNudge.current) commit(beforeNudge.current);
    beforeNudge.current = undefined;
  };

  /** Copies the selection, or the whole frame without one. */
  const copy = () => {
    const rect = getWorkArea();
    const image = selection && float.current ? float.current.lifted : cropArea(canvas, rect);
    clipboard.current = { image, x: rect.x, y: rect.y };
  };

  const cut = () => {
    if (!selection) return;
    copy();
    clearSelection();
    setSelection(undefined);
  };

  /** Lands where it was copied from, selected and floating, ready to nudge into place. */
  const paste = () => {
    if (!clipboard.current) return;
    const { image, x, y } = clipboard.current;
    const previous = snapshot();
    float.current = { under: previous, lifted: image, x, y };
    setSelection({ x, y, width: image.width, height: image.height });
    if (!tool) setTool("marquee");
    placeFloat(x, y);
    commit(previous);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!active || adjust.isPending() || isTyping(e.target)) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        handleUndo();
      }
      if (e.metaKey || e.ctrlKey) {
        const shortcut = { c: copy, x: cut, v: paste }[e.key];
        if (shortcut) {
          e.preventDefault();
          shortcut();
        }
        return;
      }
      if (e.key === "Escape") {
        float.current = undefined;
        setSelection(undefined);
      }
      if (e.key === "Delete" || e.key === "Backspace") clearSelection();
      const offset = getNudgeOffset(e.key, e.shiftKey);
      if (offset && !e.defaultPrevented) {
        e.preventDefault();
        nudge(offset.x, offset.y);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (getNudgeOffset(e.key, false)) finishNudge();
    };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keyup", handleKeyUp);
    };
  });

  const toPixel = (e: PointerEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.floor(((e.clientX - left) / width) * canvas.width),
      y: Math.floor(((e.clientY - top) / height) * canvas.height),
    };
  };

  const paintLine = (fromX: number, fromY: number, toX: number, toY: number) => {
    const ctx = getCtx(canvas);
    ctx.fillStyle = color;
    getLinePixels(fromX, fromY, toX, toY).forEach(({ x, y }) => ctx.fillRect(x, y, 1, 1));
    paintView();
  };

  const eraseLine = (fromX: number, fromY: number, toX: number, toY: number) => {
    const ctx = getCtx(canvas);
    getLinePixels(fromX, fromY, toX, toY).forEach(({ x, y }) => ctx.clearRect(x, y, 1, 1));
    paintView();
  };

  const handleDown = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (adjust.isPending()) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = toPixel(e);
    if (tool === "dropper") {
      const [r, g, b, alpha] = getCtx(canvas).getImageData(x, y, 1, 1).data;
      if (alpha) setColor(toHexColor(r, g, b));
      setTool("pencil");
      return;
    }
    before.current = snapshot();
    if (tool === "move" || (selection && tool === "marquee" && isInRect(selection, x, y))) {
      float.current ??= liftArea(getWorkArea());
      const { x: fromX, y: fromY } = float.current;
      stroke.current = { kind: "move", x, y, fromX, fromY };
      return;
    }
    float.current = undefined;
    if (tool === "pencil") {
      stroke.current = { kind: "pencil", x, y };
      paintLine(x, y, x, y);
    } else if (tool === "eraser") {
      stroke.current = { kind: "eraser", x, y };
      eraseLine(x, y, x, y);
    } else {
      stroke.current = { kind: "select", x, y };
      setSelection(undefined);
    }
  };

  const handleMove = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const current = stroke.current;
    if (!current) return;
    const { x, y } = toPixel(e);
    if (current.kind === "pencil") {
      paintLine(current.x, current.y, x, y);
      stroke.current = { ...current, x, y };
    } else if (current.kind === "eraser") {
      eraseLine(current.x, current.y, x, y);
      stroke.current = { ...current, x, y };
    } else if (current.kind === "select") {
      setSelection(getRectBetween(current.x, current.y, x, y));
    } else {
      placeFloat(current.fromX + x - current.x, current.fromY + y - current.y);
    }
  };

  const handleUp = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const current = stroke.current;
    stroke.current = undefined;
    if (current && current.kind !== "select" && before.current) commit(before.current);
  };

  return (
    <>
      {tool && (
        <Box
          as="canvas"
          ref={viewRef}
          {...{ width: canvas.width, height: canvas.height }}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            imageRendering: "pixelated",
            cursor: tool === "move" ? "move" : "crosshair",
            touchAction: "none",
            ...CHECKER_SX,
          }}
        />
      )}
      {tool && selection && (
        <Box
          style={{
            left: `${(selection.x / canvas.width) * 100}%`,
            top: `${(selection.y / canvas.height) * 100}%`,
            width: `${(selection.width / canvas.width) * 100}%`,
            height: `${(selection.height / canvas.height) * 100}%`,
          }}
          sx={{
            position: "absolute",
            boxSizing: "border-box",
            border: "1px dashed white",
            outline: "1px dashed rgba(0, 0, 0, .6)",
            pointerEvents: "none",
          }}
        />
      )}
      {active && (
        <EditToolbar
          tool={tool}
          color={color}
          canUndo={undoStack.length > 0}
          adjusting={adjust.open}
          onTool={setTool}
          onColor={setColor}
          onUndo={handleUndo}
          onAdjust={toggleAdjust}
          onFlip={(axis) => transform((image) => flipCanvas(image, axis))}
          onRotate={() => transform(rotateCanvas)}
        />
      )}
      {active && adjust.open && (
        <AdjustPanel
          hasSelection={!!selection}
          onPreview={adjust.preview}
          onApply={adjust.apply}
          onCancel={adjust.cancel}
        />
      )}
    </>
  );
};

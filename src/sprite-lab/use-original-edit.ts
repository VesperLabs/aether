import { useEffect, useMemo, useRef, useState } from "react";
import { HAND_DRAWN_MODEL } from "./draw-models";
import { cropFrame } from "./frame-stack";
import { replaceGenerationImage, saveGeneration, type Generation } from "./generations-api";
import type { Frame } from "./lab-state";
import type { Sheet } from "./sheets";

/**
 * Lets the sheet's own frame be edited without touching the sheet: a working copy is drawn on, and
 * the first save turns it into a candidate, so just looking at the original leaves nothing behind.
 */
export const useOriginalEdit = ({
  target,
  targetImage,
  frame,
  cell,
  originalOpen,
  onCreated,
}: {
  target: Sheet;
  targetImage: HTMLCanvasElement | null;
  frame: Frame;
  cell: number;
  /** Whether the original, not a candidate, is what's showing. */
  originalOpen: boolean;
  onCreated: (generation: Generation, canvas: HTMLCanvasElement) => void;
}) => {
  /* Bumped once a copy becomes a candidate, so the next edit starts from a clean one. */
  const [revision, setRevision] = useState(0);
  const created = useRef<Generation>(undefined);

  const canvas = useMemo(
    () => (targetImage ? cropFrame(targetImage, frame, cell) : undefined),
    [targetImage, frame, cell, revision],
  );

  useEffect(() => {
    if (originalOpen) created.current = undefined;
  }, [originalOpen]);

  const saveImage = async (edited: HTMLCanvasElement) => {
    /* Read at save time: saves queue up, and a later one must land on the candidate just made. */
    if (created.current) return replaceGenerationImage(created.current, edited);
    const { generation } = await saveGeneration(edited, {
      sheet: target,
      frame,
      model: HAND_DRAWN_MODEL,
      prompt: "",
    });
    created.current = generation;
    setRevision((current) => current + 1);
    onCreated(generation, edited);
    return generation;
  };

  return { canvas, saveImage };
};

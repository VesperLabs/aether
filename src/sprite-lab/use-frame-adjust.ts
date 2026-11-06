import { useEffect, useRef, useState } from "react";
import { adjustColors, type ColorAdjustment } from "./color-adjust";
import type { PixelRect } from "./frame-editing";

/** The adjust panel's live preview. Cancelling puts the frame back; applying is one undoable edit. */
export const useFrameAdjust = ({
  active,
  frameId,
  selection,
  snapshot,
  restore,
  commit,
  onStart,
}: {
  /** The editor is showing; leaving it cancels. */
  active: boolean;
  /** A different frame drops the adjustment. */
  frameId: string;
  /** What to change, or everything without one. */
  selection?: PixelRect;
  snapshot: () => ImageData;
  restore: (image: ImageData) => void;
  commit: (previous: ImageData) => void;
  /** The first change to the pixels, once per adjustment. */
  onStart: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const before = useRef<ImageData>(undefined);

  const preview = (adjustment: ColorAdjustment) => {
    if (!before.current) onStart();
    before.current ??= snapshot();
    const { data, width, height } = before.current;
    const image = new ImageData(data.slice(), width, height);
    adjustColors(image, adjustment, selection);
    restore(image);
  };

  const apply = () => {
    if (before.current) commit(before.current);
    before.current = undefined;
  };

  const cancel = () => {
    if (before.current) restore(before.current);
    before.current = undefined;
    setOpen(false);
  };

  useEffect(() => {
    if (!active && open) cancel();
  });

  useEffect(() => {
    before.current = undefined;
    setOpen(false);
  }, [frameId]);

  return {
    open,
    /** Other edits wait while an adjustment is unsettled. */
    isPending: () => !!before.current,
    start: () => setOpen(true),
    preview,
    apply,
    cancel,
  };
};

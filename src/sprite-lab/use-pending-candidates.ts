import { useCallback, useEffect, useState } from "react";
import { getGenerationUrl, listGenerations, loadImage, type Generation } from "./generations-api";
import { getFrameKey, getOpenCandidate } from "./open-candidates";

/** A draw left open on its frame: shown on the sheet, but not merged into it yet. */
export type PendingCandidate = { generation: Generation; image: HTMLImageElement };

/** Every frame's open draw, and a way to look again after one changes. */
export const usePendingCandidates = () => {
  const [pending, setPending] = useState<PendingCandidate[]>([]);
  const [revision, setRevision] = useState(0);
  const refreshPending = useCallback(() => setRevision((count) => count + 1), []);

  useEffect(() => {
    let live = true;
    listGenerations()
      .then((generations) => {
        const open = generations.filter(
          ({ id, src, frame }) => getOpenCandidate(getFrameKey(src, frame)) === id,
        );
        return Promise.all(
          open.map(async (generation) => ({
            generation,
            image: await loadImage(getGenerationUrl(generation)),
          })),
        );
      })
      .then((loaded) => {
        if (live) setPending(loaded);
      });
    return () => {
      live = false;
    };
  }, [revision]);

  return { pending, revision, refreshPending };
};

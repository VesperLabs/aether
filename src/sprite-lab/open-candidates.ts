import type { Frame } from "./lab-state";

const STORAGE_KEY = "sprite-lab-open-candidates";

export const getFrameKey = (src: string, { column, row }: Frame) => `${src}:${column},${row}`;

const read = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
};

/** The draw left open on a frame of a sheet, so it's there again on return or after a reload. */
export const getOpenCandidate = (frameKey: string): string | undefined => read()[frameKey];

const write = (candidates: Record<string, string>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(candidates));
  } catch {
    /* Only a convenience: without storage the frame just opens with nothing selected. */
  }
};

export const setOpenCandidate = (frameKey: string, id: string) =>
  write({ ...read(), [frameKey]: id });

/** Merged into the sheet, so there's nothing left waiting on this frame. */
export const clearOpenCandidate = (frameKey: string) => {
  const { [frameKey]: _cleared, ...rest } = read();
  write(rest);
};

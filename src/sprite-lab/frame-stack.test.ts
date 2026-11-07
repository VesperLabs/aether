import { describe, expect, it } from "vitest";
import { keepRedrawn, type StackedSheet } from "./frame-stack";
import type { PendingCandidate } from "./use-pending-candidates";

const sheet = (src: string) => ({ layer: "hair", src }) as StackedSheet;
const stack = [sheet("body"), sheet("hair"), sheet("face")];
const frame = { column: 0, row: 1 };
const openOn = (src: string, row: number) =>
  ({ generation: { src, frame: { column: 0, row } } }) as PendingCandidate;

describe("keepRedrawn", () => {
  it("drops sheets not redrawn on this frame, but never the target", () => {
    const pending = [openOn("hair", 1), openOn("face", 2)];
    expect(keepRedrawn(stack, frame, "body", pending).map(({ src }) => src)).toEqual([
      "body",
      "hair",
    ]);
  });
});

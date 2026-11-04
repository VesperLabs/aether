import { useEffect, useState } from "react";

const DIRECTIONS = ["up", "right", "down", "left"] as const;
export type WalkDirection = (typeof DIRECTIONS)[number];

/** Which walk frame to show, and facing which way. */
export interface WalkPose {
  direction: WalkDirection;
  step: number;
}

/** The game's walk animation plays its three frames there and back. */
const WALK_STEPS = [0, 1, 2, 1];
const STEP_MS = 125;
/** Turns every 750ms. */
const STEPS_PER_TURN = 6;

/** Every step of the walk, for measuring the sheet. */
export const ALL_WALK_POSES: WalkPose[] = DIRECTIONS.flatMap((direction) =>
  [0, 1, 2].map((step) => ({ direction, step })),
);

export const getWalkFrameName = ({ direction, step }: WalkPose) => `${direction}-walk.00${step}`;

/** The side of a sheet's square cell, read from its atlas name (`80x80.json`). */
const getCellSize = (atlas?: string) => Number(/(\d+)x\d+\.json$/.exec(atlas ?? "")?.[1] ?? 0);

/** A frame in an animated sheet: one row per direction, then a standing column and the walk. */
export const getWalkFrameRect = (atlas: string | undefined, pose: WalkPose) => {
  const cell = getCellSize(atlas);
  if (!cell) return undefined;
  return [(pose.step + 1) * cell, DIRECTIONS.indexOf(pose.direction) * cell, cell, cell];
};

/** A quarter turn counter-clockwise; `DIRECTIONS` runs clockwise. */
export const getNextDirection = (current: WalkDirection) =>
  DIRECTIONS[(DIRECTIONS.indexOf(current) + DIRECTIONS.length - 1) % DIRECTIONS.length];

/** The pose to draw while `walking`: starts facing the viewer, then keeps turning. */
export function useWalkCycle(walking: boolean) {
  const [pose, setPose] = useState<WalkPose>();
  useEffect(() => {
    if (!walking) return;
    let tick = 0;
    let direction: WalkDirection = "down";
    const advance = () => {
      if (tick > 0 && tick % STEPS_PER_TURN === 0) direction = getNextDirection(direction);
      setPose({ direction, step: WALK_STEPS[tick % WALK_STEPS.length] });
      tick += 1;
    };
    advance();
    const timer = setInterval(advance, STEP_MS);
    return () => {
      clearInterval(timer);
      setPose(undefined);
    };
  }, [walking]);
  return pose;
}

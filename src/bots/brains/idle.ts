import { STAND_STILL, type Brain } from "./brain";

/** Stands still: a connected player that does nothing, for load runs. */
export const idle: Brain = () => STAND_STILL;

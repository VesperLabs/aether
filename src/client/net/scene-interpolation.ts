import {
  DEFAULT_SERVER_FPS,
  EXTRA_INTERPOLATION_BUFFER_MS,
  INTERPOLATION_BUFFER_TICKS,
} from "@/shared/constants";
import { createNetInterpolator } from "./interpolation";

const serverTickHz = (() => {
  const n = Number(process.env.SERVER_FPS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_SERVER_FPS;
})();

export const netInterp = createNetInterpolator({
  serverFps: serverTickHz,
  bufferTicks: INTERPOLATION_BUFFER_TICKS,
  extraBufferMs: EXTRA_INTERPOLATION_BUFFER_MS,
});

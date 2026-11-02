import { DEFAULT_SERVER_FPS } from "@/network";
import { createInterpolator } from "./interpolation";

const serverFps = Number(process.env.SERVER_FPS) || DEFAULT_SERVER_FPS;

export const netInterp = createInterpolator(1000 / serverFps);

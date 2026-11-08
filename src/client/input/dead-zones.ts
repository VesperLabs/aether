/**
 * How far each stick must lean before it counts. Saved per device (localStorage), like the
 * bindings, since every controller rests a little off centre in its own way.
 */

export interface DeadZones {
  move: number;
  aim: number;
}

/* Aiming wants more: only the direction matters, and it's noisiest near the centre */
const DEFAULT_DEAD_ZONES: DeadZones = { move: 0.2, aim: 0.35 };

/** Past this a stick would barely register at all. */
export const MAX_DEAD_ZONE = 0.6;

const STORAGE_KEY = "aether.deadZones";

const clamp = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(MAX_DEAD_ZONE, Math.max(0, value))
    : fallback;

function load(): DeadZones {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<DeadZones>;
    return {
      move: clamp(saved?.move, DEFAULT_DEAD_ZONES.move),
      aim: clamp(saved?.aim, DEFAULT_DEAD_ZONES.aim),
    };
  } catch {
    return { ...DEFAULT_DEAD_ZONES };
  }
}

let deadZones = load();
const listeners = new Set<() => void>();

export const getDeadZones = () => deadZones;

export function subscribeDeadZones(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setDeadZone(stick: keyof DeadZones, value: number) {
  deadZones = { ...deadZones, [stick]: clamp(value, deadZones[stick]) };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deadZones));
  } catch {
    /* Private windows may refuse; the setting still holds until reload */
  }
  listeners.forEach((listener) => listener());
}

export function resetDeadZones() {
  setDeadZone("move", DEFAULT_DEAD_ZONES.move);
  setDeadZone("aim", DEFAULT_DEAD_ZONES.aim);
}

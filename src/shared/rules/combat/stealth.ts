import { MIN_STEALTH_ALPHA } from "./constants";

export interface StealthViewer {
  stats?: { level?: number } | null;
}

export interface StealthInput {
  distance: number;
  /** Who is looking. */
  observer: StealthViewer | null | undefined;
  /** The one hiding. */
  player: StealthViewer | null | undefined;
  stealthBuff?: { level?: number } | null;
  maxVisibilityRange?: number;
}

/**
 * How visible a stealthed player is to an observer, from 0 (invisible) up to `MIN_STEALTH_ALPHA`.
 * The more the observer outlevels the hider, the farther they can see.
 */
export function calculateStealthVisibilityPercent({
  distance,
  observer,
  player,
  stealthBuff,
  maxVisibilityRange = 160,
}: StealthInput) {
  const BASE_VISIBILITY_RANGE = 50; // Base visibility range when levels are equal
  const LEVEL_ADVANTAGE_FACTOR = 0.5; // Factor for extending visibility per level difference

  const observerLevel = observer?.stats?.level ?? 1;
  const playerLevel = player?.stats?.level ?? 1;
  const stealthBuffLevel = stealthBuff?.level ?? 1;

  const levelDifference = Math.max(
    0,
    observerLevel - (Math.floor(playerLevel / 2) + stealthBuffLevel * 4),
  );

  const visibilityRange = Math.min(
    BASE_VISIBILITY_RANGE + levelDifference * LEVEL_ADVANTAGE_FACTOR * BASE_VISIBILITY_RANGE,
    maxVisibilityRange,
  );

  let percent = 1 - Math.min(distance / visibilityRange, 1);
  percent = Math.max(0, Math.min(percent, MIN_STEALTH_ALPHA));

  return percent;
}

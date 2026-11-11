import type { Calendar } from "./rules";

/** A whole day, midnight to midnight, lasts two real hours. */
export const DAY_LENGTH_MS = 2 * 60 * 60 * 1000;

const HOURS_PER_DAY = 24;

/** `value` mod `by`, never negative. */
const wrap = (value: number, by: number) => ((value % by) + by) % by;

/** The hour of the day at `now`, 0 up to 24 with fractions (6.5 is half past six). */
export function hourAt(now: number, calendar: Calendar): number {
  return (wrap(now + calendar.dayOffsetMs, DAY_LENGTH_MS) / DAY_LENGTH_MS) * HOURS_PER_DAY;
}

/** Moves the clock so it is `hour` at `now`; the day carries on from there. */
export function setHour(calendar: Calendar, now: number, hour: number): void {
  const target = (wrap(hour, HOURS_PER_DAY) / HOURS_PER_DAY) * DAY_LENGTH_MS;
  calendar.dayOffsetMs = target - wrap(now, DAY_LENGTH_MS);
}

/** The hour `elapsedMs` of game time after `hour`. */
export function hourAfter(hour: number, elapsedMs: number): number {
  return wrap(hour + (elapsedMs / DAY_LENGTH_MS) * HOURS_PER_DAY, HOURS_PER_DAY);
}

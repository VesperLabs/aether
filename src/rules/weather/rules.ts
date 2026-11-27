import type { Season } from "@/content";
import { roll } from "./roll";
import { windAt } from "./wind";

/** The world's sky, calm to wild. Showers and storms fall as each map's season allows (see `skyIn`). */
export const SKIES = ["clear", "cloudy", "foggy", "showers", "storm"] as const;
export type Sky = (typeof SKIES)[number];

/** What falls from a sky: rain, or snow in winter. */
export type Fall = "rain" | "snow";

/** The sky as one map sees it: the world's, and what falls from it there, if anything. */
export interface LocalSky {
  sky: Sky;
  fall?: Fall;
}

/** What the world's `sky` looks like over a map showing `season`, so snow never falls in summer. */
export function skyIn(sky: Sky, season: Season): LocalSky {
  if (sky !== "showers" && sky !== "storm") return { sky };
  return { sky, fall: season === "winter" ? "snow" : "rain" };
}

/** The sky and the wind its clouds drift on. */
export interface Weather {
  sky: Sky;
  /** Which way the clouds drift, radians (0 is east, down is positive). */
  windAngle: number;
  /** How fast they drift, px/s. */
  windSpeed: number;
}

/** Holds the world's sky while `/weather` pins one; unset follows the forecast. */
export interface WeatherState {
  pinnedSky?: Sky;
}

export const createWeatherState = (): WeatherState => ({});

/** Weather holds for a spell this long before it may turn. */
export const WEATHER_SPELL_MS = 20 * 60 * 1000;
/** How likely a spell keeps the sky the last one had, so weather lingers. */
const KEEP_CHANCE = 0.5;
/** How often each sky comes up when it turns, by the world's season: fog in fall, storms in summer. */
const SKY_ODDS: Record<Season, readonly (readonly [Sky, number])[]> = {
  spring: [
    ["clear", 0.4],
    ["cloudy", 0.25],
    ["foggy", 0.1],
    ["showers", 0.18],
    ["storm", 0.07],
  ],
  summer: [
    ["clear", 0.5],
    ["cloudy", 0.22],
    ["foggy", 0.05],
    ["showers", 0.1],
    ["storm", 0.13],
  ],
  fall: [
    ["clear", 0.35],
    ["cloudy", 0.27],
    ["foggy", 0.2],
    ["showers", 0.12],
    ["storm", 0.06],
  ],
  winter: [
    ["clear", 0.35],
    ["cloudy", 0.25],
    ["foggy", 0.12],
    ["showers", 0.18],
    ["storm", 0.1],
  ],
};
/**
 * How wild each sky is. Weather climbs and falls one step a spell (clear, clouds, showers, storm),
 * never from clear straight to a storm. Fog is calm, beside clear.
 */
const RANK: Record<Sky, number> = { clear: 0, foggy: 0, cloudy: 1, showers: 2, storm: 3 };
const SKY_AT_RANK: readonly Sky[] = ["clear", "cloudy", "showers", "storm"];
/**
 * The forecast runs in windows of this many spells (12 hours), each starting clear and clearing
 * again at its end, so every spell follows the same chain and it never jumps at a window's edge.
 */
const WINDOW = 36;
/** A window's last spells only step down, room to come down from a storm. */
const CLEARING = RANK.storm;

function pickSky(spell: number, season: Season): Sky {
  let r = roll(spell, 1);
  for (const [sky, odds] of SKY_ODDS[season]) {
    if (r < odds) return sky;
    r -= odds;
  }
  return "clear";
}

/** One step from `from` toward `to`: straight there when they are a step apart or less. */
function stepToward(from: Sky, to: Sky): Sky {
  const gap = RANK[to] - RANK[from];
  if (Math.abs(gap) <= 1) return to;
  return SKY_AT_RANK[RANK[from] + Math.sign(gap)];
}

/** The sky in a spell: followed forward from its window's clear start, each often keeping the last. */
function skyOfSpell(spell: number, season: Season): Sky {
  const start = Math.floor(spell / WINDOW) * WINDOW;
  let sky: Sky = "clear";
  for (let s = start + 1; s <= spell; s++) {
    if (s - start >= WINDOW - CLEARING) {
      sky = stepToward(sky, "clear");
      continue;
    }
    if (roll(s, 2) < KEEP_CHANCE) continue;
    sky = stepToward(sky, pickSky(s, season));
  }
  return sky;
}

/**
 * The weather at `now` (a real date in ms). It is forecast, not rolled live: every server and test
 * gets the same weather for the same time, and it holds for a spell (`WEATHER_SPELL_MS`), often
 * longer, before it turns, one step at a time. The world's `season` sets the odds. `/weather` can
 * pin the sky; the wind still follows the forecast.
 */
export function weatherAt(now: number, state: WeatherState, season: Season): Weather {
  const spell = Math.floor(now / WEATHER_SPELL_MS);
  return { sky: state.pinnedSky ?? skyOfSpell(spell, season), ...windAt(now) };
}

/** Holds the world's sky, or hands it back to the forecast with none. */
export function pinSky(state: WeatherState, sky: Sky | undefined): void {
  state.pinnedSky = sky;
}

/** The sky whose name starts with `text`, so `/weather o` works. */
export function findSky(text: string): Sky | undefined {
  const lower = text.toLowerCase();
  return lower ? SKIES.find((sky) => sky.startsWith(lower)) : undefined;
}

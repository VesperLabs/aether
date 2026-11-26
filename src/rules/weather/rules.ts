import { roll } from "./roll";
import { windAt } from "./wind";

/** How cloudy the sky is. */
export const SKIES = ["clear", "cloudy", "foggy"] as const;
export type Sky = (typeof SKIES)[number];

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
/** How often each sky comes up when it turns. */
const SKY_ODDS: readonly (readonly [Sky, number])[] = [
  ["clear", 0.5],
  ["cloudy", 0.35],
  ["foggy", 0.15],
];
/** How many spells back a lingering sky is looked for; past this it is rolled fresh. */
const MAX_LOOKBACK = 8;

function pickSky(spell: number): Sky {
  let r = roll(spell, 1);
  for (const [sky, odds] of SKY_ODDS) {
    if (r < odds) return sky;
    r -= odds;
  }
  return "clear";
}

/** The sky in a spell: often the last spell's, else a fresh pick. */
function skyOfSpell(spell: number): Sky {
  for (let back = 0; back < MAX_LOOKBACK; back++) {
    if (roll(spell - back, 2) >= KEEP_CHANCE) return pickSky(spell - back);
  }
  return pickSky(spell - MAX_LOOKBACK);
}

/**
 * The weather at `now` (a real date in ms). It is forecast, not rolled live: every server and test
 * gets the same weather for the same time, and it holds for a spell (`WEATHER_SPELL_MS`), often
 * longer, before it turns. `/weather` can pin the sky; the wind still follows the forecast.
 */
export function weatherAt(now: number, state: WeatherState): Weather {
  const spell = Math.floor(now / WEATHER_SPELL_MS);
  return { sky: state.pinnedSky ?? skyOfSpell(spell), ...windAt(now) };
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

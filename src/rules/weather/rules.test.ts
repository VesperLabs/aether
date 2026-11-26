import { describe, expect, it } from "vitest";
import { createWeatherState, findSky, pinSky, WEATHER_SPELL_MS, weatherAt } from "./rules";

const DAY = 24 * 60 * 60 * 1000;
const START = Date.UTC(2026, 10, 1);

describe("weatherAt", () => {
  it("gives the same weather for the same time", () => {
    const state = createWeatherState();
    expect(weatherAt(START + 12345, state)).toEqual(weatherAt(START + 12345, state));
  });

  it("holds the whole spell", () => {
    const state = createWeatherState();
    const spellStart = Math.ceil(START / WEATHER_SPELL_MS) * WEATHER_SPELL_MS;
    const first = weatherAt(spellStart, state);
    expect(weatherAt(spellStart + WEATHER_SPELL_MS - 1, state)).toEqual(first);
  });

  it("comes up clear, cloudy and foggy over a month, clear most often", () => {
    const state = createWeatherState();
    const counts = { clear: 0, cloudy: 0, foggy: 0 };
    for (let t = START; t < START + 30 * DAY; t += WEATHER_SPELL_MS) {
      counts[weatherAt(t, state).sky]++;
    }
    expect(counts.cloudy).toBeGreaterThan(0);
    expect(counts.foggy).toBeGreaterThan(0);
    expect(counts.clear).toBeGreaterThan(counts.foggy);
  });

  it("lingers: the sky changes far less often than every spell", () => {
    const state = createWeatherState();
    let changes = 0;
    let spells = 0;
    let last = weatherAt(START, state).sky;
    for (let t = START + WEATHER_SPELL_MS; t < START + 30 * DAY; t += WEATHER_SPELL_MS) {
      const sky = weatherAt(t, state).sky;
      if (sky !== last) changes++;
      last = sky;
      spells++;
    }
    expect(changes / spells).toBeLessThan(0.5);
  });

  it("drifts its clouds at a gentle speed", () => {
    const { windSpeed } = weatherAt(START, createWeatherState());
    expect(windSpeed).toBeGreaterThanOrEqual(6);
    expect(windSpeed).toBeLessThanOrEqual(14);
  });

  it("keeps a pinned sky until it is handed back", () => {
    const state = createWeatherState();
    pinSky(state, "cloudy");
    for (let t = START; t < START + DAY; t += WEATHER_SPELL_MS) {
      expect(weatherAt(t, state).sky).toBe("cloudy");
    }
    pinSky(state, undefined);
    expect(state.pinnedSky).toBeUndefined();
  });
});

describe("findSky", () => {
  it("matches by the start of the name", () => {
    expect(findSky("clo")).toBe("cloudy");
    expect(findSky("CLE")).toBe("clear");
    expect(findSky("f")).toBe("foggy");
    expect(findSky("")).toBeUndefined();
    expect(findSky("rain")).toBeUndefined();
  });
});

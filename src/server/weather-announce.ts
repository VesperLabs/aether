import { weatherAt } from "@/rules/weather";
import type { System } from "@/rules/world";
import type { ServerWorld } from "./server-world";

/**
 * Tells every client when the weather turns, by the forecast or by `/weather`. Clients learn the
 * weather they start in from `heroInit` and `roomObserved`.
 */
export const announceWeather: System<ServerWorld> = (world) => {
  const weather = weatherAt(world.now(), world.weather);
  const key = `${weather.sky}|${weather.windAngle}`;
  if (key === world.announcedWeather) return;
  world.announcedWeather = key;
  world.io.emit("weatherChanged", weather);
};

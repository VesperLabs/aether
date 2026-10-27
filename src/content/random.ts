/** Random integer between `min` and `max`, both included. */
export function randomNumber(min: number, max: number): number {
  if (max <= min) return min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Deep copy of plain JSON data. Returns null for a falsy input. */
export function cloneJson<T>(value: T): T {
  return (value ? JSON.parse(JSON.stringify(value)) : null) as T;
}

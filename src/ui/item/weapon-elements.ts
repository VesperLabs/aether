/** The elements a weapon deals damage in. Item definitions give rolled stats as `[min, max]`. */
export function deriveElements(stats: Record<string, unknown> = {}) {
  const elements: string[] = [];
  for (const [statKey, v] of Object.entries(stats)) {
    const statValue = Array.isArray(v) ? Math.max(...v.map(Number)) : Number(v);
    if (statKey === "maxFireDamage" && statValue > 0) {
      elements.push("fire");
    }
    if (statKey === "maxWaterDamage" && statValue > 0) {
      elements.push("water");
    }
    if (statKey === "maxLightDamage" && statValue > 0) {
      elements.push("light");
    }
    if (statKey === "maxEarthDamage" && statValue > 0) {
      elements.push("earth");
    }
    if (statKey === "maxHolyDamage" && statValue > 0) {
      elements.push("holy");
    }
  }
  return elements;
}

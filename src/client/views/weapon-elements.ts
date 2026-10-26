export function deriveElements(stats: Record<string, unknown> = {}) {
  const elements: string[] = [];
  for (const [statKey, v] of Object.entries(stats)) {
    const statValue = Number(v);
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

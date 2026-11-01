import { theme } from "./theme";

/** Theme tokens for mana and stamina, shared by their bars, costs, drains and windup rings. */
export const RESOURCE_TOKENS = {
  mp: { hue: "blue", shade: 500 },
  sp: { hue: "yellow", shade: 300 },
} as const;

export type Resource = keyof typeof RESOURCE_TOKENS;

/** A resource's color as a theme token, e.g. `"blue.500"`. */
export function resourceToken(resource: Resource) {
  const { hue, shade } = RESOURCE_TOKENS[resource];
  return `${hue}.${shade}`;
}

/** A resource's color as a CSS hex string, e.g. `"#3b82f6"`. */
export function resourceHex(resource: Resource): string {
  const { hue, shade } = RESOURCE_TOKENS[resource];
  return theme.colors[hue][shade];
}

/** A resource's color as a Phaser tint, e.g. `0x3b82f6`. */
export function resourceTint(resource: Resource) {
  return parseInt(resourceHex(resource).slice(1), 16);
}

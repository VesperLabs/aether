type CharacterLayer =
  | "shadow"
  | "skin"
  | "chest"
  | "pants"
  | "boots"
  | "gloves"
  | "armor"
  | "accessory"
  | "hair"
  | "face"
  | "whiskers"
  | "helmet"
  | "handLeft"
  | "handRight";

/** Back to front, per facing direction. Hands on the far side go behind the body. */
const LAYER_ORDER: Record<string, CharacterLayer[]> = {
  up: [
    "shadow",
    "handRight",
    "handLeft",
    "skin",
    "chest",
    "pants",
    "boots",
    "gloves",
    "armor",
    "accessory",
    "hair",
    "face",
    "whiskers",
    "helmet",
  ],
  down: [
    "shadow",
    "skin",
    "hair",
    "pants",
    "boots",
    "chest",
    "armor",
    "gloves",
    "face",
    "whiskers",
    "accessory",
    "helmet",
    "handRight",
    "handLeft",
  ],
  left: [
    "shadow",
    "handRight",
    "skin",
    "pants",
    "boots",
    "chest",
    "armor",
    "hair",
    "face",
    "whiskers",
    "accessory",
    "helmet",
    "gloves",
    "handLeft",
  ],
  right: [
    "shadow",
    "handLeft",
    "skin",
    "pants",
    "boots",
    "chest",
    "armor",
    "hair",
    "face",
    "whiskers",
    "accessory",
    "helmet",
    "gloves",
    "handRight",
  ],
};

export function getLayerOrder(direction: string, isLeftShield = false) {
  const order = [...(LAYER_ORDER[direction] ?? LAYER_ORDER.down)];
  /* Facing down, a shield is held in front of the weapon */
  if (direction === "down" && isLeftShield) order.push("handRight");
  return order;
}

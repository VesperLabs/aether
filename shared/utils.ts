import { isEqual, get } from "lodash";
export const isMobile =
  /Android|Mobile|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
export const HAIR_HIDING_HELMETS = ["helmet-armet", "helmet-hood", "helmet-horned", "helmet-jake"];
export const FACE_HIDING_HELMETS = ["helmet-armet", "helmet-horned", "helmet-jake"];
export const ACCESSORY_HIDING_HELMETS = ["helmet-armet", "helmet-horned"];
export const FACE_HIDING_ACCESSORIES = ["accessory-jake"];
export const HAIR_HIDING_ACCESSORIES = ["accessory-jake"];
export const MAX_INVENTORY_ITEMS = 32;
export const ILVL_MULTIPLIER = 8; // ilvl * this = monster level that can drop it
export const RANGE_MULTIPLIER = 28; //weapon range multiplier
export const BUFF_SPELLS = [
  "evasion",
  "brute",
  "endurance",
  "genius",
  "haste",
  "stun",
  "slow",
  "regeneration",
  "stealth",
  "guard",
];
export const BLANK_TEXTURE = "human-blank";
export const POTION_COOLDOWN = 10000;
export const BODY_SIZE = 8;
export const RACES_WITH_ATTACK_ANIMS = ["crab", "human", "bear", "wolf", "slime"];
export const POTION_BASES = ["hpPotion", "mpPotion"];
export const CONSUMABLES_BASES = ["food", ...POTION_BASES];
export const MINI_MAP_SIZE = 160;
export const MIN_STEALTH_ALPHA = 0.4;
export const DEFAULT_USER_SETTINGS: UserSettings = {
  showMinimap: true,
  playMusic: true,
  videoChat: false,
  charLevels: false,
};

export function getAngleFromDirection(direction) {
  let angle = 0;

  if (direction === "up") angle = 270;
  if (direction === "down") angle = 90;
  if (direction === "left") angle = 180;
  if (direction === "right") angle = 0;

  return angle;
}

export function capitalize(str) {
  if (str.length == 0) return str;
  return str[0].toUpperCase() + str.substr(1);
}

export function trimCanvas(c) {
  let ctx = c.getContext("2d"),
    pixels = ctx.getImageData(0, 0, c.width, c.height),
    l = pixels.data.length,
    i,
    bound = {
      top: null,
      left: null,
      right: null,
      bottom: null,
    },
    x,
    y;

  for (i = 0; i < l; i += 4) {
    if (pixels.data[i + 3] !== 0) {
      x = (i / 4) % c.width;
      y = ~~(i / 4 / c.width);

      if (bound.top === null) {
        bound.top = y;
      }

      if (bound.left === null) {
        bound.left = x;
      } else if (x < bound.left) {
        bound.left = x;
      }

      if (bound.right === null) {
        bound.right = x;
      } else if (bound.right < x) {
        bound.right = x;
      }

      if (bound.bottom === null) {
        bound.bottom = y;
      } else if (bound.bottom < y) {
        bound.bottom = y;
      }
    }
  }

  var trimHeight = bound.bottom + 1 - bound.top,
    trimWidth = bound.right + 1 - bound.left,
    trimmed = ctx.getImageData(bound.left, bound.top, trimWidth, trimHeight),
    copy = document.createElement("canvas").getContext("2d");

  copy.canvas.width = trimWidth;
  copy.canvas.height = trimHeight;
  copy.putImageData(trimmed, 0, 0);
  return copy.canvas;
}

export function applyTintToImage(image, tint) {
  try {
    const canvas = imageToCanvas(image);
    const tintedCanvas = tintCanvas(canvas, tint);
    return tintedCanvas;
  } catch (error) {
    console.error("Error applying tint to image:", error);
    return null;
  }
}

export const imageToCanvas = (image) => {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  return canvas;
};

export function tintCanvas(c, tint = "0xFFFFFF") {
  let ctx = c.getContext("2d"),
    copy = document.createElement("canvas").getContext("2d"),
    copy2 = document.createElement("canvas").getContext("2d"),
    copy3 = document.createElement("canvas").getContext("2d");

  const trimWidth = c?.width;
  const trimHeight = c?.height;

  const trimmed = ctx.getImageData(0, 0, trimWidth, trimHeight);

  copy.canvas.width = trimWidth;
  copy.canvas.height = trimHeight;
  copy2.canvas.width = trimWidth;
  copy2.canvas.height = trimHeight;
  copy3.canvas.width = trimWidth;
  copy3.canvas.height = trimHeight;

  copy.putImageData(trimmed, 0, 0);
  copy2.putImageData(trimmed, 0, 0);
  copy3.putImageData(trimmed, 0, 0);

  copy2.clearRect(0, 0, trimWidth, trimHeight);
  copy2.fillStyle = "#" + tint?.replace("0x", "");
  copy2.fillRect(0, 0, trimWidth, trimHeight);
  copy3.globalCompositeOperation = "source-in";
  copy3.drawImage(copy2.canvas, 0, 0, trimWidth, trimHeight, 0, 0, trimWidth, trimHeight);
  copy.globalCompositeOperation = "multiply";
  copy.drawImage(copy3.canvas, 0, 0, trimWidth, trimHeight, 0, 0, trimWidth, trimHeight);
  return copy.canvas;
}

export function assetToCanvas({ asset, tint, setImageData, shouldTrim = true }) {
  loadCacheImage(asset.src)
    .then((img) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;

      const [x, y, w, h] = asset.previewRect;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, x, y, w, h, 0, 0, w, h);

      const trimmedCanvas = shouldTrim ? trimCanvas(canvas) : canvas;
      const tintedCanvas = tintCanvas(trimmedCanvas, tint);
      setImageData(tintedCanvas.toDataURL("image/png"));
    })
    .catch((error) => {
      console.error("Error loading or processing image:", error);
    });
}

export function convertMsToS(s) {
  return (s / 1000).toFixed(2) + "s";
}

export const formatStats = (stats = {}) =>
  Object.entries(stats).reduce((acc, [key, value]) => {
    // skip these
    if (["mpCost", "hpCost", "spCost"].includes(key)) return acc;

    // combine damage min-max into one x - x stat:
    if ((key?.includes("Damage") && key?.includes("max")) || key?.includes("min")) {
      const identifier = key.replace("min", "").replace("max", "");
      if (!acc.hasOwnProperty(identifier)) {
        acc[identifier] = formatStat(identifier, [
          stats?.[`min${identifier}`] || 0,
          stats[`max${identifier}`] || 0,
        ]);
      }
    } else {
      acc[key] = formatStat(key, value);
    }

    return acc;
  }, {});

const formatStat = (key, value) => {
  if (key.includes("Damage")) {
    if (Array.isArray(value)) {
      const formattedValue = value.map((item) => `${item}`).join(" ↔ ");
      return formattedValue;
    }
    return value;
  } else if (["hp", "mp"].includes(key)) {
    if (Array.isArray(value)) {
      const formattedValue = value.map((item) => `+${item}`).join(" ↔ ");
      return formattedValue;
    }
    return "+" + value;
  } else if (key.includes("Delay") || key.includes("duration")) {
    if (Array.isArray(value)) {
      const formattedValue = value
        .map((item) => convertMsToS(item)?.replace(".00", ""))
        .join(" ↔ ");
      return formattedValue;
    }
    return convertMsToS(value)?.replace(".00", "");
  } else if (
    key.includes("Steal") ||
    key.includes("Chance") ||
    key.includes("Resistance") ||
    key.includes("magicFind")
  ) {
    if (Array.isArray(value)) {
      const formattedValue = value.map((item) => `${item}%`).join(" ↔ ");
      return formattedValue;
    }
    return value + "%";
  } else {
    return value;
  }
};

export function msToHours(ms) {
  if (!ms) return 0;
  const millisecondsInHour = 60 * 60 * 1000; // Number of milliseconds in an hour
  return (ms / millisecondsInHour).toFixed(2) + " hrs";
}

export function filterVisibleEquipment(player: FullCharacterState) {
  return Object.fromEntries(
    Object.entries(player?.equipment ?? {}).filter(([key]) =>
      player?.activeItemSlots?.includes(key)
    )
  );
}

export function distanceTo(first, second) {
  let dx = second?.x - first?.x;
  let dy = second?.y - first?.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Utility function to load an image and handle the onload event as a Promise
export const IMAGE_CACHE = {}; // In-memory cache for images

export function loadCacheImage(src) {
  if (IMAGE_CACHE[src]) {
    return Promise.resolve(IMAGE_CACHE[src]); // Return cached image if available
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      IMAGE_CACHE[src] = img; // Cache the loaded image
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

export function arePropsEqualWithKeys(keys) {
  return (prevProps, nextProps) => {
    return keys.every((key) => isEqual(get(prevProps, key), get(nextProps, key)));
  };
}

export function itemHasRequiredStats({ requirements, player, key }) {
  const playerStat = player?.stats?.[key];
  const requiredStat = requirements[key];

  if (key === "charClass") {
    return player?.charClass === requiredStat;
  }

  return playerStat >= requiredStat;
}

export function calculateStealthVisibilityPercent({
  distance,
  observer,
  player,
  stealthBuff,
  maxVisibilityRange = 160,
}) {
  const BASE_VISIBILITY_RANGE = 50; // Base visibility range when levels are equal
  const LEVEL_ADVANTAGE_FACTOR = 0.5; // Factor for extending visibility per level difference

  const observerLevel = observer?.stats?.level ?? 1;
  const playerLevel = player?.stats?.level ?? 1;
  const stealthBuffLevel = stealthBuff?.level ?? 1;

  // Calculate level difference
  // Factor in stealthBuff's level
  const levelDifference = Math.max(
    0,
    observerLevel - (Math.floor(playerLevel / 2) + stealthBuffLevel * 4)
  );

  // Extend visibility range based on level difference, capped at maxVisibilityRange
  const visibilityRange = Math.min(
    BASE_VISIBILITY_RANGE + levelDifference * LEVEL_ADVANTAGE_FACTOR * BASE_VISIBILITY_RANGE,
    maxVisibilityRange
  );

  // Calculate visibility percentage
  let percent = 1 - Math.min(distance / visibilityRange, 1);
  percent = Math.max(0, Math.min(percent, MIN_STEALTH_ALPHA)); // Ensure percent is between 0 and 1

  return percent;
}

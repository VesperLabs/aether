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

export const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
  navigator.userAgent
);

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

export function assetToCanvas({ asset, tint, setImageData }) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const img = new Image();
  img.crossOrigin = "Anonymous";

  img.onload = () => {
    const [x, y, w, h] = asset.previewRect;
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
    const trimmedCanvas = trimCanvas(canvas);
    const tintedCanvas = tintCanvas(trimmedCanvas, tint);
    setImageData(tintedCanvas.toDataURL("image/png"));
  };

  img.src = asset.src;
}

export function convertMsToS(s) {
  return (s / 1000).toFixed(2) + "s";
}

export const formatStats = (stats = {}) =>
  Object.entries(stats).reduce((acc, [key, value]) => {
    // skip these
    if (["mpCost", "spCost"].includes(key)) return acc;

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

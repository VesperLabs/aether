import React, { forwardRef, useState, useRef, useEffect } from "react";
import { Box, Icon } from "./";
import { resolveAsset } from "../Assets";
import { useAppContext } from "./App";

const STYLE_ABS = { top: 0, left: 0, position: "absoute" };
const STYLE_EMPTY = { filter: "grayscale(100%)", opacity: 0.3 };
const STYLE_NON_EMPTY = (rarity) => ({
  border: (t) => `1px solid ${t.colors[rarity]}`,
  background: (t) => `radial-gradient(circle, ${t.colors[rarity]} 0%, ${t.colors.shadow[15]} 125%)`,
});
const BLANK_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const Slot = forwardRef(({ sx, size = 52, item, icon, ...props }, ref) => {
  const { player } = useAppContext();
  const [imageData, setImageData] = useState(BLANK_IMAGE);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [target, setTarget] = useState(null);
  const imageRef = useRef(null);

  useEffect(() => {
    if (!item) return;
    const asset = resolveAsset(item, player);
    if (!asset) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const img = new Image();

    img.onload = () => {
      const [x, y, w, h] = asset.previewRect;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
      const trimmedCanvas = trimAndTintCanvas(canvas, item?.tint);
      setImageData(trimmedCanvas.toDataURL("image/png"));
    };

    img.src = asset.src;
  }, [item]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!dragging) return;
      setPosition({
        x: event.clientX - imageRef.current.offsetWidth / 2,
        y: event.clientY - imageRef.current.offsetHeight / 2,
      });
    };
    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [dragging]);

  const handleMouseDown = (event) => {
    setPosition({
      x: event.clientX - imageRef.current.offsetWidth / 2,
      y: event.clientY - imageRef.current.offsetHeight / 2,
    });
    setDragging(true);
  };

  const handleMouseUp = (event) => {
    setDragging(false);
    setTarget(event.target);
  };

  const handleTouchStart = (event) => {
    setPosition({
      x: event.touches[0].clientX - imageRef.current.offsetWidth / 2,
      y: event.touches[0].clientY - imageRef.current.offsetHeight / 2,
    });
    setDragging(true);
  };

  const handleTouchMove = (event) => {
    setPosition({
      x: event.touches[0].clientX - imageRef.current.offsetWidth / 2,
      y: event.touches[0].clientY - imageRef.current.offsetHeight / 2,
    });
  };

  const handleTouchEnd = (event) => {
    setDragging(false);
    setTarget(event.target);
  };

  return (
    <Box
      ref={ref}
      sx={{
        position: "relative",
        touchAction: "none",
        userSelect: "none",
        backgroundColor: "shadow.10",
        border: (t) => `1px solid ${t.colors.shadow[25]}`,
        borderRadius: 2,
        pointerEvents: "all",
        overflow: dragging ? "visible" : "hidden",
        width: size,
        height: size,
        ...STYLE_ABS,
        ...(item?.rarity ? STYLE_NON_EMPTY(item?.rarity) : STYLE_EMPTY),
        ...sx,
      }}
      onMouseUp={handleMouseUp}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      {...props}
    >
      <Icon
        ref={imageRef}
        icon={imageData}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        size={size}
        sx={{
          zIndex: dragging ? 9999 : 1,
          position: dragging ? "fixed" : "unset",
          left: dragging ? position.x : 0,
          top: dragging ? position.y : 0,
          cursor: dragging ? "grabbing" : "grab",
          transform: dragging ? "scale(4,4)" : "scale(2,2)",
          imageRendering: "pixelated",
        }}
      />
    </Box>
  );
});

function trimAndTintCanvas(c, tint = "FFFFFF") {
  let ctx = c.getContext("2d"),
    copy = document.createElement("canvas").getContext("2d"),
    copy2 = document.createElement("canvas").getContext("2d"),
    copy3 = document.createElement("canvas").getContext("2d"),
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
    trimmed = ctx.getImageData(bound.left, bound.top, trimWidth, trimHeight);

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

export default Slot;

import React, { useState, useRef, useLayoutEffect } from "react";
import { Box, Icon, ItemTooltip, theme } from "./";
import { resolveAsset } from "../Assets";
import { useAppContext } from "./App";
import { isMobile } from "../utils";

const STYLE_ABS = { top: 0, left: 0, position: "absoute" };
const STYLE_EMPTY = (icon) => ({
  background: `${theme.colors.shadow[20]} url(${icon}) center center no-repeat`,
  filter: "grayscale(100%)",
  opacity: 0.3,
});
const STYLE_NON_EMPTY = (rarity) => ({
  border: (t) => `1px solid ${t.colors[rarity]}`,
  background: (t) => `radial-gradient(circle, ${t.colors[rarity]} 0%, ${t.colors.shadow[15]} 125%)`,
});
const BLANK_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const Slot = ({ sx, size = 52, item, location, icon, ...props }) => {
  const { player, socket } = useAppContext();
  const [imageData, setImageData] = useState(BLANK_IMAGE);
  const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [target, setTarget] = useState(null);
  const imageRef = useRef(null);
  const { dropItem } = useItemEvents({ item, location });

  const handleMouseDown = (e) => {
    setPosition({
      x: e.clientX - imageRef.current.offsetWidth / 2,
      y: e.clientY - imageRef.current.offsetHeight / 2,
    });
    setDragging(true);
    setTarget(document.elementFromPoint(e.clientX, e.clientY));
  };

  const handleTouchStart = (e) => {
    e.stopPropagation();
    setPosition({
      x: e.touches[0].clientX - imageRef.current.offsetWidth / 2,
      y: e.touches[0].clientY - imageRef.current.offsetHeight / 2,
    });
    setDragging(true);
    setTimeout(
      () => setTarget(document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY)),
      1
    );
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPosition({
      x: e.clientX - imageRef.current.offsetWidth / 2,
      y: e.clientY - imageRef.current.offsetHeight / 2,
    });
    setTarget(document.elementFromPoint(e.clientX, e.clientY));
  };

  const handleTouchMove = (e) => {
    if (!dragging) return;
    setPosition({
      x: e.touches[0].clientX - imageRef.current.offsetWidth / 2,
      y: e.touches[0].clientY - imageRef.current.offsetHeight / 2,
    });
    setTarget(document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY));
  };

  const handleMouseUp = (e) => {
    if (!dragging) return;
    const t = document.elementFromPoint(e.clientX, e.clientY);
    setTarget(t);
    dropItem(t);
    setDragging(false);
  };

  const handleTouchEnd = (e) => {
    if (!dragging) return;
    e.stopPropagation();
    e.preventDefault();
    const t = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    setTarget(t);
    dropItem(t);
    setDragging(false);
  };

  const handleMouseEnter = (e) => {
    setHovering(true);
  };
  const handleMouseLeave = (e) => {
    setHovering(false);
  };

  /* Loads the item canvas data out of the texture */
  useLayoutEffect(() => {
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
      const trimmedCanvas = trimCanvas(canvas);
      const tintedCanvas = tintCanvas(trimmedCanvas, item?.tint);
      setImageData(tintedCanvas.toDataURL("image/png"));
    };

    img.src = asset.src;
  }, [item]);

  /* Bind our global movement events */
  useLayoutEffect(() => {
    if (!item) return;
    document.addEventListener("touchend", handleTouchEnd);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("touchmove", handleTouchMove);
    return () => {
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("touchmove", handleTouchMove);
    };
  }, [dragging, item]);

  useLayoutEffect(() => {
    if (target?.nodeName == "CANVAS") {
      window.dispatchEvent(
        new CustomEvent("item_drag", {
          detail: position,
        })
      );
    }
  }, [position]);

  const mouseBinds = item
    ? {
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
      }
    : {};

  const targetMoved = target?.dataset?.tooltipId !== item?.id;
  const showTooltip = (dragging && !targetMoved) || (hovering && !isMobile);

  return (
    <Box
      data-tooltip-id={item?.id}
      sx={{
        position: "relative",
        touchAction: "none",
        userSelect: "none",
        border: (t) => `1px solid ${t.colors.shadow[30]}`,
        borderRadius: 2,
        pointerEvents: dragging ? "all" : "none",
        overflow: dragging ? "visible" : "hidden",
        width: size,
        height: size,
        ...STYLE_ABS,
        ...(item?.rarity ? STYLE_NON_EMPTY(item?.rarity) : STYLE_EMPTY(icon)),
        ...sx,
      }}
      {...mouseBinds}
      {...props}
    >
      {item && (
        <>
          <Icon
            ref={imageRef}
            icon={imageData}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            size={size}
            sx={{
              touchAction: "none",
              userSelect: "none",
              pointerEvents: dragging ? "none" : "all",
              zIndex: dragging ? 9999 : 1,
              position: dragging ? "fixed" : "unset",
              left: dragging ? position.x : 0,
              top: dragging ? position.y : 0,
              cursor: dragging ? "grabbing" : "grab",
              transform: dragging ? "scale(4,4)" : "scale(2,2)",
              imageRendering: "pixelated",
            }}
          />
          <ItemTooltip item={item} show={showTooltip} />
        </>
      )}
    </Box>
  );
};

function useItemEvents({ location, item }) {
  const { player, socket } = useAppContext();
  return {
    dropItem: (target) => {
      if (target?.nodeName == "CANVAS" && !player?.state?.isDead) {
        socket.emit("dropItem", { item, location });
      }
    },
  };
}

function trimCanvas(c) {
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

function tintCanvas(c, tint = "0xFFFFFF") {
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

export default Slot;

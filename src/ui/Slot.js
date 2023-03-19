import React, { useState, useRef, useLayoutEffect } from "react";
import { Box, Icon, ItemTooltip, theme } from "./";
import { resolveAsset } from "../Assets";
import { useAppContext } from "./App";
import { isMobile, trimCanvas, tintCanvas } from "../utils";

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
        new CustomEvent("ITEM_DRAG", {
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

export default Slot;

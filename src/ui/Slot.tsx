import React, { useState, useRef, useLayoutEffect } from "react";
import {
  Box,
  Icon,
  ItemTooltip,
  SLOT_SIZE,
  STYLE_SLOT_EMPTY,
  STYLE_NON_EMPTY,
  BLANK_IMAGE,
  SlotAmount,
} from "./";
import { resolveAsset } from "../../shared/Assets";
import { useAppContext } from "./App";
import { isMobile, trimCanvas, tintCanvas } from "../utils";
import { useDoubleTap } from "use-double-tap";

type SlotProps = {
  sx?: object;
  size?: integer;
  item?: Item;
  slotKey?: string;
  location?: string;
  icon?: string;
  stock?: integer;
  disabled?: boolean;
};

const Slot = React.memo(
  ({
    sx,
    size = SLOT_SIZE,
    item,
    slotKey,
    location,
    icon,
    stock,
    disabled,
    ...props
  }: SlotProps) => {
    // component logic here
    const { hero } = useAppContext();
    const [imageData, setImageData] = useState(BLANK_IMAGE);
    const [dragging, setDragging] = useState(false);
    const [hovering, setHovering] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [target, setTarget] = useState(null);
    const imageRef = useRef(null);
    const { dropItem, consumeItem } = useItemEvents({
      item,
      location,
      slotKey,
    });
    const shouldBindEvents = item && !disabled;

    const handleMouseDown = (e) => {
      setPosition({
        x: e.clientX - imageRef.current.offsetWidth / 2,
        y: e.clientY - imageRef.current.offsetHeight / 2,
      });
      setDragging(true);
      setTarget(document.elementFromPoint(e.clientX, e.clientY));
    };

    const handleTouchStart = (e) => {
      if (dragging) e.preventDefault();
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
      const asset = resolveAsset(item, hero);
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
      if (!shouldBindEvents) return;
      document.addEventListener("touchend", handleTouchEnd, { passive: true });
      document.addEventListener("mouseup", handleMouseUp, { passive: true });
      document.addEventListener("mousemove", handleMouseMove, { passive: true });
      document.addEventListener("touchmove", handleTouchMove, { passive: true });
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

    const outerMouseBinds = {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    };

    const doubleTabBinds = useDoubleTap(
      shouldBindEvents
        ? () => {
            consumeItem();
          }
        : null
    );

    const innerMouseBinds = shouldBindEvents
      ? {
          onMouseDown: handleMouseDown,
          onTouchStart: handleTouchStart,
        }
      : {};

    const dataKeys = {
      "data-location": location,
      "data-slot-key": slotKey,
    };

    const targetMoved = target?.dataset?.tooltipId !== item?.id;
    const aboutToSell = dragging && target?.closest(".menu-keeper") && location !== "shop";
    const showTooltip =
      (dragging && !targetMoved) || (hovering && !isMobile) || (hovering && !isMobile && disabled);

    return (
      <Box
        data-tooltip-id={item?.id}
        sx={{
          touchAction: "none",
          userSelect: "none",
          pointerEvents: "all",
          overflow: dragging ? "visible" : "hidden",
          width: size,
          height: size,
          top: 0,
          left: 0,
          ...(item?.rarity ? STYLE_NON_EMPTY(item?.rarity) : STYLE_SLOT_EMPTY(icon)),
          ...sx,
        }}
        {...doubleTabBinds}
        {...dataKeys}
        {...outerMouseBinds}
        {...props}
      >
        {item && (
          <>
            {item?.amount > 1 && <SlotAmount>{item?.amount}</SlotAmount>}
            <Icon
              ref={imageRef}
              icon={aboutToSell ? "../assets/icons/gold.png" : imageData}
              size={size * 2} // Fixes large images to not get cut off
              style={{
                touchAction: "none",
                userSelect: "none",
                pointerEvents: dragging ? "none" : "all",
                zIndex: dragging ? 9999 : 1,
                position: dragging ? "fixed" : "static",
                left: (dragging ? position.x : 0) + "px",
                top: (dragging ? position.y : 0) + "px",
                // Fixes large images to not get cut off
                marginLeft: (dragging ? 0 : -size / 2) + "px",
                marginTop: (dragging ? 0 : -size / 2) + "px",
                cursor: dragging ? "grabbing" : "grab",
                transform: dragging ? "scale(4,4)" : "scale(2,2)",
                imageRendering: "pixelated",
              }}
              {...innerMouseBinds}
              {...dataKeys}
            />
            <ItemTooltip item={item} show={showTooltip} />
          </>
        )}
      </Box>
    );
  },
  (prevProps: any, nextProps: any) => {
    // Only re-render if item id or amount has changed
    const prevItem = prevProps.item;
    const nextItem = nextProps.item;
    return (
      prevItem === nextItem ||
      (prevItem?.id === nextItem?.id &&
        prevItem?.amount === nextItem?.amount &&
        prevItem?.stock === nextItem?.stock)
    );
  }
);

function useItemEvents({ location, slotKey, item }) {
  const { hero, socket, setDropItem } = useAppContext();

  return {
    consumeItem: () => {
      /* So far can only consume from inventory */
      if (location === "inventory") return socket.emit("consumeItem", { item, location });
    },
    dropItem: (target) => {
      if (hero?.state?.isDead) return;
      const { nodeName, dataset } = target ?? {};
      /* Anywhere -> Ground */
      if (nodeName == "CANVAS" && location !== "shop") {
        if (item?.amount > 1) {
          /* If more than 1, open up the drop modal */
          return setDropItem({ ...item, location, action: "DROP" });
        } else {
          if (["set", "rare", "unique"]?.includes(item?.rarity)) {
            return setDropItem({ ...item, location, action: "DROP_CONFIRM" });
          }
          return socket.emit("dropItem", { item, location });
        }
      }
      /* Anywhere -> Shop */
      if (target?.closest(".menu-keeper")) {
        if (item?.amount > 1) {
          /* If more than 1, open up the drop modal */
          return setDropItem({ ...item, location, action: "SHOP", slotKey });
        } else {
          if (["set", "rare", "unique"]?.includes(item?.rarity)) {
            return setDropItem({
              ...item,
              location,
              action: "SHOP_CONFIRM",
              slotKey,
            });
          } else {
            return socket.emit("moveItem", {
              to: {
                location: "shop",
              },
              from: { slot: slotKey, location },
            });
          }
        }
      }
      /* Anywhere -> Anywhere */
      if (dataset?.slotKey) {
        if (dataset?.location === location && dataset?.slotKey === slotKey) return;
        return socket.emit("moveItem", {
          to: {
            slot: dataset?.slotKey,
            location: dataset?.location,
          },
          from: { slot: slotKey, location },
        });
      }
    },
  };
}

export default Slot;

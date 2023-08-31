import React, { useState, useRef, useLayoutEffect, memo } from "react";
import { Box, Icon, Portal, Donut, SLOT_SIZE, STYLE_SLOT_EMPTY, STYLE_NON_EMPTY } from "@aether/ui";
import { ItemTooltip, BLANK_IMAGE, SlotAmount } from "./";
import { useAppContext } from "./App";
import {
  resolveAsset,
  assetToCanvas,
  CONSUMABLES_BASES,
  arePropsEqualWithKeys,
} from "@aether/shared";
import { useDoubleTap } from "use-double-tap";

const SpaceDonut = ({ percent = 0 }) => {
  const getColor = () => {
    if (percent > 0.75) {
      return "danger";
    }
    if (percent > 0.5) {
      return "yellow.200";
    }
    return "set";
  };
  return (
    <Donut
      sx={{
        position: "absolute",
        zIndex: 2,
        color: getColor(),
        "& circle:first-of-type": {
          opacity: 0.25,
          color: "#000",
        },
        ml: "1px",
        mt: "1px",
      }}
      size="12px"
      strokeWidth="6px"
      value={percent}
    />
  );
};

type SlotProps = {
  sx?: object;
  size?: integer;
  item?: Item;
  slotKey?: string;
  location?: string;
  icon?: string;
  stock?: integer;
  disabled?: boolean;
  bagId?: string;
};

const Slot = memo(
  ({
    sx,
    size = SLOT_SIZE,
    item,
    slotKey,
    location,
    icon,
    stock,
    disabled,
    bagId,
    ...props
  }: SlotProps) => {
    const { hero } = useAppContext();
    const [imageData, setImageData] = useState(BLANK_IMAGE);
    const [dragging, setDragging] = useState(false);
    const [hovering, setHovering] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [target, setTarget] = useState(null);
    const imageRef = useRef(null);
    const { dropItem, doubleClickItem } = useItemEvents({
      bagId,
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
      const x = e.clientX - imageRef.current.offsetWidth / 2;
      const y = e.clientY - imageRef.current.offsetHeight / 2;
      const t = document.elementFromPoint(e.clientX, e.clientY);
      setPosition({ x, y });
      if (t?.nodeName == "CANVAS") {
        window.dispatchEvent(
          new CustomEvent("ITEM_DRAG", {
            detail: {
              x: e.clientX,
              y: e.clientY,
            },
          })
        );
      }
      setTarget(t);
    };

    const handleTouchMove = (e) => {
      if (!dragging) return;
      const x = e.touches[0].clientX - imageRef.current.offsetWidth / 2;
      const y = e.touches[0].clientY - imageRef.current.offsetHeight / 2;
      const t = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
      setPosition({ x, y });
      if (t?.nodeName == "CANVAS") {
        window.dispatchEvent(
          new CustomEvent("ITEM_DRAG", {
            detail: {
              x: e.touches[0].clientX,
              y: e.touches[0].clientY,
            },
          })
        );
      }
      setTarget(t);
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
      assetToCanvas({ asset, tint: item?.tint, setImageData });
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

    const outerMouseBinds = {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    };

    const doubleTabBinds = useDoubleTap(
      shouldBindEvents
        ? () => {
            doubleClickItem();
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
      "data-bag-id": bagId,
    };

    const isActive =
      hero?.activeItemSlots?.includes(slotKey) || !["abilities", "equipment"]?.includes(location);
    const tooltipId = `${location}-${item?.id}`;
    const targetMoved = target?.dataset?.tooltipId !== tooltipId;
    const aboutToSell = dragging && target?.closest(".menu-keeper") && location !== "shop";
    const showTooltip = (dragging && !targetMoved) || hovering;

    return (
      <Box
        data-tooltip-id={tooltipId}
        sx={{
          touchAction: "none",
          userSelect: "none",
          pointerEvents: "all",
          overflow: "hidden",
          top: 0,
          left: 0,
          ...(item?.rarity
            ? STYLE_NON_EMPTY({ rarity: item?.rarity, isActive })
            : STYLE_SLOT_EMPTY(icon)),
          width: size,
          height: size,
          ...sx,
        }}
        {...doubleTabBinds}
        {...dataKeys}
        {...outerMouseBinds}
        {...props}
      >
        {item && (
          <>
            {item?.base === "bag" && (
              <SpaceDonut percent={item?.items?.filter((i) => i)?.length / item?.space || 0} />
            )}
            {item?.amount > 1 && <SlotAmount>{item?.amount}</SlotAmount>}
            <Icon
              icon={imageData}
              size={size * 2} // Fixes large images to not get cut off
              style={{
                touchAction: "none",
                userSelect: "none",
                pointerEvents: dragging ? "none" : "all",
                zIndex: 1,
                opacity: dragging ? 0.5 : 1,
                filter: dragging ? "grayscale(100%)" : "none",
                cursor: dragging ? "grabbing" : "grab",
                transform: "scale(2,2)",
                imageRendering: "pixelated",
                // Fixes large images to not get cut off
                marginLeft: -size / 2 + "px",
                marginTop: -size / 2 + "px",
              }}
              {...innerMouseBinds}
              {...dataKeys}
            />
            <Portal container={dragging ? document.body : null}>
              <Icon
                ref={imageRef}
                icon={aboutToSell ? "./assets/icons/gold.png" : imageData}
                size={size * 2} // Fixes large images to not get cut off
                style={{
                  opacity: dragging ? 1 : 0,
                  touchAction: "none",
                  userSelect: "none",
                  pointerEvents: "none",
                  zIndex: 999,
                  position: "fixed",
                  left: position.x + "px",
                  top: position.y + "px",
                  // Fixes large images to not get cut off
                  marginLeft: (dragging ? 0 : -size / 2) + "px",
                  marginTop: (dragging ? 0 : -size / 2) + "px",
                  cursor: dragging ? "grabbing" : "grab",
                  transform: dragging ? "scale(4,4)" : "scale(2,2)",
                  imageRendering: "pixelated",
                }}
              />
            </Portal>
            <ItemTooltip item={item} show={showTooltip} tooltipId={tooltipId} />
          </>
        )}
      </Box>
    );
  },
  arePropsEqualWithKeys(["id", "amount", "items", "stock", "item.id"])
);

function useItemEvents({ location, bagId, slotKey, item }) {
  const { hero, socket, setDropItem, toggleBagState, bagState } = useAppContext();

  return {
    doubleClickItem: () => {
      if (!["inventory", "abilities", "bag"].includes(location)) return;
      /* If it is food we are trying to consume it */
      if (CONSUMABLES_BASES.includes(item?.base)) {
        window.dispatchEvent(
          new CustomEvent("HERO_USE_ITEM", {
            detail: { item, location },
          })
        );
      }
      /* If it is a bag, we open it */
      if (item?.base === "bag") {
        toggleBagState(item?.id);
      }
    },
    dropItem: (target) => {
      const { nodeName, dataset } = target ?? {};
      if (hero?.state?.isDead) return;
      if (
        dataset?.location === location &&
        dataset?.slotKey === slotKey &&
        dataset.bagId === bagId
      ) {
        return;
      }
      /* Anywhere -> Ground */
      if (nodeName == "CANVAS" && location !== "shop") {
        if (item?.amount > 1) {
          /* If more than 1, open up the drop modal */
          return setDropItem({ ...item, location, bagId, action: "DROP" });
        } else {
          if (["set", "rare", "unique"]?.includes(item?.rarity)) {
            return setDropItem({ ...item, location, bagId, action: "DROP_CONFIRM" });
          }
          if (["bag"]?.includes(item?.base)) {
            /* Close open bag */
            if (bagState?.find?.((id) => id === item?.id)) {
              toggleBagState(item?.id);
            }
            return setDropItem({ ...item, location, bagId, action: "DROP_CONFIRM" });
          }
          return socket.emit("dropItem", { item, bagId, location });
        }
      }
      /* Anywhere -> Shop */
      if (target?.closest(".menu-keeper")) {
        if (item?.amount > 1) {
          /* If more than 1, open up the drop modal */
          return setDropItem({ ...item, location, bagId, action: "SHOP_SELL_AMOUNT", slotKey });
        } else {
          if (["set", "rare", "unique"]?.includes(item?.rarity) || ["bag"]?.includes(item?.base)) {
            /* Close open bag */
            if (bagState?.find?.((id) => id === item?.id)) {
              toggleBagState(item?.id);
            }
            return setDropItem({
              ...item,
              location,
              action: "SHOP_SELL_CONFIRM",
              slotKey,
              bagId,
            });
          } else {
            // so that we can play the sell sound
            if (location !== "shop") {
              window.dispatchEvent(
                new CustomEvent("AUDIO_ITEM_SELL", {
                  detail: item,
                })
              );
            }
            return socket.emit("moveItem", {
              to: {
                location: "shop",
              },
              from: { bagId, slot: slotKey, location },
            });
          }
        }
      }
      /* Anywhere -> Anywhere */
      if (dataset?.slotKey) {
        if (location === "shop") {
          if (item?.slot === "stackable") {
            return setDropItem({
              ...item,
              location,
              action: "SHOP_BUY_AMOUNT",
              slotKey,
              bagId,
              dataset,
            });
          }
        }
        return socket.emit("moveItem", {
          to: {
            bagId: dataset?.bagId, //if we have a bag
            slot: dataset?.slotKey,
            location: dataset?.location,
          },
          from: { bagId, slot: slotKey, location },
        });
      }
    },
  };
}

export default Slot;

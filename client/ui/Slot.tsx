import { useState, useRef, useLayoutEffect, memo } from "react";
import { Box, Icon, Portal, Donut, SLOT_SIZE, STYLE_SLOT_EMPTY, STYLE_NON_EMPTY } from "@aether/ui";
import { ItemTooltip, BLANK_IMAGE, SlotAmount } from "./";
import { resolveAsset, assetToCanvas, arePropsEqualWithKeys, isMobile } from "@aether/shared";
import { useDoubleTap } from "use-double-tap";
import { isEqual, get } from "lodash";

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
  player: FullCharacterState;
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
    player,
    ...props
  }: SlotProps) => {
    console.log("H");
    const [imageData, setImageData] = useState(BLANK_IMAGE);
    const [dragging, setDragging] = useState(false);
    const [hovering, setHovering] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [target, setTarget] = useState(null);
    const imageRef = useRef(null);
    const { dropItem, doubleClickItem } = useItemEvents({
      player,
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
      const asset = resolveAsset(item, player);
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
      player?.activeItemSlots?.includes(slotKey) || !["abilities", "equipment"]?.includes(location);
    const tooltipId = `${location}-${item?.id}`;
    const targetMoved = target?.dataset?.tooltipId !== tooltipId;
    const aboutToSell = dragging && target?.closest(".menu-keeper") && location !== "shop";
    const showTooltip = isMobile ? hovering : (dragging && !targetMoved) || hovering;

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
            <ItemTooltip player={player} item={item} show={showTooltip} tooltipId={tooltipId} />
          </>
        )}
      </Box>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps.location === "equipment") {
      const itemSlotsChanged = !isEqual(
        get(prevProps, "player.activeItemSlots"),
        get(nextProps, "player.activeItemSlots")
      );
      const activeSetsChanged = !isEqual(
        get(prevProps, "player.state.activeSets"),
        get(nextProps, "player.state.activeSets")
      );
      const isSetRarityChanged =
        (get(prevProps, "item.rarity") === "set" || get(nextProps, "item.rarity") === "set") &&
        activeSetsChanged;

      if (isSetRarityChanged || itemSlotsChanged) {
        return false;
      }
    }

    return ["id", "amount", "items", "stock", "item.id"].every((key) =>
      isEqual(get(prevProps, key), get(nextProps, key))
    );
  }
);

function useItemEvents({ location, bagId, slotKey, item, player }) {
  return {
    doubleClickItem: () => {
      window.dispatchEvent(
        new CustomEvent("HERO_DOUBLE_CLICK_ITEM", {
          detail: { item, location },
        })
      );
    },
    dropItem: (target) => {
      window.dispatchEvent(
        new CustomEvent("HERO_DROP_ITEM", {
          detail: { item, location, bagId, slotKey, player, target },
        })
      );
    },
  };
}

export default Slot;

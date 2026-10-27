import { useState, useRef, useLayoutEffect, memo } from "react";
import type { BuiltItem } from "@/content";
import type { HudCharacter } from "@/client/hud/app/context";
import {
  Box,
  Icon,
  Portal,
  Donut,
  SLOT_SIZE,
  STYLE_SLOT_EMPTY,
  STYLE_NON_EMPTY,
  theme,
} from "@/ui";
import { ItemTooltip } from "@/ui";
import { BLANK_IMAGE } from "@/client/hud/app/constants";
import { SlotAmount } from "./slot-amount";
import { resolveAsset } from "@/content";
import { assetToCanvas } from "@/ui";
import { isMobile } from "@/ui";
import { useDoubleTap } from "use-double-tap";
import type { ThemeUIStyleObject } from "theme-ui";
import { shouldReRenderSlot, getIsItemActive, useItemEvents } from "./slot-state";

const SpaceDonut = ({ percent = 0 }: { percent?: number }) => {
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

export type SlotProps = {
  sx?: ThemeUIStyleObject;
  size?: number;
  item?: BuiltItem | null;
  slotKey?: string;
  location?: string;
  icon?: string;
  stock?: number;
  disabled?: boolean;
  bagId?: string;
  player?: Partial<HudCharacter> | null;
};

export const Slot = memo(
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
    const [imageData, setImageData] = useState(BLANK_IMAGE);
    const [dragging, setDragging] = useState(false);
    const [hovering, setHovering] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [target, setTarget] = useState<Element | null>(null);
    const imageRef = useRef<HTMLDivElement>(null);
    const { dropItem, doubleClickItem } = useItemEvents({
      player,
      bagId,
      item,
      location,
      slotKey,
    });
    const shouldBindEvents = item && !disabled;
    const handleMouseDown = (e: React.MouseEvent) => {
      const image = imageRef.current as HTMLDivElement;
      setPosition({
        x: e.clientX - image.offsetWidth / 2,
        y: e.clientY - image.offsetHeight / 2,
      });
      setDragging(true);
      setTarget(document.elementFromPoint(e.clientX, e.clientY));
    };

    const handleTouchStart = (e: React.TouchEvent) => {
      if (dragging) e.preventDefault();
      e.stopPropagation();
      const image = imageRef.current as HTMLDivElement;
      setPosition({
        x: e.touches[0].clientX - image.offsetWidth / 2,
        y: e.touches[0].clientY - image.offsetHeight / 2,
      });
      setDragging(true);
      setTimeout(
        () => setTarget(document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY)),
        1,
      );
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      const image = imageRef.current as HTMLDivElement;
      const x = e.clientX - image.offsetWidth / 2;
      const y = e.clientY - image.offsetHeight / 2;
      const t = document.elementFromPoint(e.clientX, e.clientY);
      setPosition({ x, y });
      if (t?.nodeName == "CANVAS") {
        window.dispatchEvent(
          new CustomEvent("ITEM_DRAG", {
            detail: {
              x: e.clientX,
              y: e.clientY,
            },
          }),
        );
      }
      setTarget(t);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!dragging) return;
      const image = imageRef.current as HTMLDivElement;
      const x = e.touches[0].clientX - image.offsetWidth / 2;
      const y = e.touches[0].clientY - image.offsetHeight / 2;
      const t = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
      setPosition({ x, y });
      if (t?.nodeName == "CANVAS") {
        window.dispatchEvent(
          new CustomEvent("ITEM_DRAG", {
            detail: {
              x: e.touches[0].clientX,
              y: e.touches[0].clientY,
            },
          }),
        );
      }
      setTarget(t);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!dragging) return;
      const t = document.elementFromPoint(e.clientX, e.clientY);
      setTarget(t);
      dropItem(t);
      setDragging(false);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!dragging) return;
      e.stopPropagation();
      const t = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      setTarget(t);
      dropItem(t);
      setDragging(false);
    };

    const handleMouseEnter = () => {
      setHovering(true);
    };
    const handleMouseLeave = () => {
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
      document.addEventListener("mousemove", handleMouseMove, {
        passive: true,
      });
      document.addEventListener("touchmove", handleTouchMove, {
        passive: true,
      });
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
        : null,
    );

    const innerMouseBinds = shouldBindEvents
      ? {
          onMouseDown: handleMouseDown,
          onTouchStart: handleTouchStart,
        }
      : {};

    const isActive = getIsItemActive({ item, player, location, slotKey });
    const tooltipId = `${location}-${item?.id}`;
    const targetMoved = (target as HTMLElement | null)?.dataset?.tooltipId !== tooltipId;
    const aboutToSell = dragging && target?.closest(".menu-keeper") && location !== "shop";

    /* When to show the tooltip */
    const showTooltipDesktop = (dragging && !targetMoved) || hovering;
    const showTooltipMobile = disabled ? hovering : dragging && !targetMoved;
    const showTooltip = isMobile ? showTooltipMobile : showTooltipDesktop;

    const dataKeys = {
      "data-location": location,
      "data-slot-key": slotKey,
      "data-bag-id": bagId,
      "data-id": item?.id,
      "data-base": item?.base,
    };

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
              <SpaceDonut
                percent={
                  (item?.items?.filter((i) => i)?.length as number) / (item?.space as number) || 0
                }
              />
            )}
            {item?.amount > 1 && <SlotAmount>{item?.amount}</SlotAmount>}
            {item?.slot === "spell" && <SlotAmount>Lvl. {item?.ilvl}</SlotAmount>}
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
                  zIndex: theme.zIndices.draggable,
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
  shouldReRenderSlot,
);

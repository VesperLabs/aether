import { useState, useRef, useLayoutEffect, useEffectEvent, memo } from "react";
import { useDoubleTap } from "use-double-tap";
import type { ThemeUIStyleObject } from "theme-ui";
import { resolveAsset, type BuiltItem } from "@/content";
import type { FullCharacterWire } from "@/network";
import { assetToCanvas, Box, Donut, Icon, isMobile, Portal, theme } from "@/ui/kit";
import { SLOT_SIZE, STYLE_NON_EMPTY, STYLE_SLOT_EMPTY } from "./slot-style";
import { ItemTooltip } from "./item-tooltip";
import { SlotAmount } from "./slot-amount";
import { shouldReRenderSlot, getIsItemActive } from "./slot-state";
import { ElementalItemArt } from "./elemental-item-art";
import { deriveElements } from "./weapon-elements";

const BLANK_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

/** Who armour icons are drawn for when the slot has no player (the wiki item list). */
const DEFAULT_ASSET_USER = { profile: { race: "human", gender: "female" } };

/** Where a slot sits, passed back to its events. */
export interface SlotPlace {
  item: BuiltItem;
  location?: string;
  slotKey?: string;
  bagId?: string;
  player?: Partial<FullCharacterWire> | null;
}

/** What happens when a slot's item is dropped or double-clicked. A slot without events is display-only. */
export interface SlotEvents {
  onDrop: (place: SlotPlace, target: Element | null) => void;
  onDoubleClick: (place: SlotPlace) => void;
}

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
  player?: Partial<FullCharacterWire> | null;
  events?: SlotEvents;
};

export const ItemSlot = memo(
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
    events,
    ...props
  }: SlotProps) => {
    const [imageData, setImageData] = useState(BLANK_IMAGE);
    const [dragging, setDragging] = useState(false);
    const [hovering, setHovering] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [target, setTarget] = useState<Element | null>(null);
    const imageRef = useRef<HTMLDivElement>(null);
    const place = item ? { item, location, slotKey, bagId, player } : undefined;
    const dropItem = (t: Element | null) => place && events?.onDrop(place, t);
    const doubleClickItem = () => place && events?.onDoubleClick(place);
    const shouldBindEvents = item && events && !disabled;
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

    const handleMouseMove = useEffectEvent((e: MouseEvent) => {
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
    });

    const handleTouchMove = useEffectEvent((e: TouchEvent) => {
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
    });

    const handleMouseUp = useEffectEvent((e: MouseEvent) => {
      if (!dragging) return;
      const t = document.elementFromPoint(e.clientX, e.clientY);
      setTarget(t);
      dropItem(t);
      setDragging(false);
    });

    const handleTouchEnd = useEffectEvent((e: TouchEvent) => {
      if (!dragging) return;
      e.stopPropagation();
      const t = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      setTarget(t);
      dropItem(t);
      setDragging(false);
    });

    const handleMouseEnter = () => {
      setHovering(true);
    };
    const handleMouseLeave = () => {
      setHovering(false);
    };

    const profile = player?.profile;

    /* Loads the item canvas data out of the texture */
    useLayoutEffect(() => {
      if (!item) return;
      const asset = resolveAsset(item, profile ? { profile } : DEFAULT_ASSET_USER);
      if (!asset) return;
      assetToCanvas({ asset, tint: item?.tint, setImageData });
    }, [item, profile]);

    /* Bind our global movement events */
    useLayoutEffect(() => {
      if (!shouldBindEvents) return;
      const onTouchEnd = (e: TouchEvent) => handleTouchEnd(e);
      const onMouseUp = (e: MouseEvent) => handleMouseUp(e);
      const onMouseMove = (e: MouseEvent) => handleMouseMove(e);
      const onTouchMove = (e: TouchEvent) => handleTouchMove(e);
      document.addEventListener("touchend", onTouchEnd, { passive: true });
      document.addEventListener("mouseup", onMouseUp, { passive: true });
      document.addEventListener("mousemove", onMouseMove, { passive: true });
      document.addEventListener("touchmove", onTouchMove, { passive: true });
      return () => {
        document.removeEventListener("touchend", onTouchEnd);
        document.removeEventListener("mouseup", onMouseUp);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("touchmove", onTouchMove);
      };
    }, [shouldBindEvents]);

    const outerMouseBinds = {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      /* A tap opens a slot that can't be dragged; tapping elsewhere fires the leave that closes it. */
      ...(!shouldBindEvents && { onClick: handleMouseEnter }),
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

    const elements = item?.type === "weapon" ? deriveElements(item.stats) : [];
    const asset =
      elements.length > 0 && item
        ? resolveAsset(item, profile ? { profile } : DEFAULT_ASSET_USER)
        : undefined;
    /* Elemental weapons animate over the icon, which stays underneath to take drags and taps */
    const showElemental = !!asset && !dragging;

    const isActive = getIsItemActive({ item, player, location, slotKey });
    const tooltipId = `${location}-${item?.id ?? item?.key}`;
    const targetMoved = (target as HTMLElement | null)?.dataset?.tooltipId !== tooltipId;
    const aboutToSell = dragging && target?.closest(".menu-keeper") && location !== "shop";
    /* ...and while dragged, over the copy that follows the pointer, unless it's about to sell */
    const dragElemental = !!asset && dragging && !aboutToSell;

    /* When to show the tooltip */
    const showTooltipDesktop = (dragging && !targetMoved) || hovering;
    /* Slots that can't be dragged (disabled, or display-only like the wiki's) open on a tap. */
    const showTooltipMobile = shouldBindEvents ? dragging && !targetMoved : hovering;
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
          /* Only draggable slots hold on to the touch; display-only ones let a swipe scroll. */
          touchAction: shouldBindEvents ? "none" : "auto",
          userSelect: "none",
          pointerEvents: "all",
          overflow: "hidden",
          position: "relative",
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
                touchAction: shouldBindEvents ? "none" : "auto",
                userSelect: "none",
                pointerEvents: dragging ? "none" : "all",
                zIndex: 1,
                opacity: dragging ? 0.5 : showElemental ? 0 : 1,
                filter: dragging ? "grayscale(100%)" : "none",
                cursor: shouldBindEvents ? (dragging ? "grabbing" : "grab") : "default",
                transform: "scale(2,2)",
                imageRendering: "pixelated",
                // Fixes large images to not get cut off
                marginLeft: -size / 2 + "px",
                marginTop: -size / 2 + "px",
              }}
              {...innerMouseBinds}
              {...dataKeys}
            />
            {showElemental && asset && (
              <ElementalItemArt
                asset={asset}
                tint={item?.tint}
                elements={elements}
                scale={2}
                layerSx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              />
            )}
            <Portal container={dragging ? document.body : null}>
              <Icon
                ref={imageRef}
                icon={aboutToSell ? "./assets/icons/gold.png" : imageData}
                size={size * 2} // Fixes large images to not get cut off
                style={{
                  opacity: dragging && !dragElemental ? 1 : 0,
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
              {dragElemental && asset && (
                <ElementalItemArt
                  asset={asset}
                  tint={item?.tint}
                  elements={elements}
                  scale={4}
                  layerSx={{
                    position: "fixed",
                    // The dragged icon is a box twice the slot's size at the pointer: its centre
                    left: position.x + size + "px",
                    top: position.y + size + "px",
                    transform: "translate(-50%, -50%)",
                    zIndex: theme.zIndices.draggable,
                  }}
                />
              )}
            </Portal>
            <ItemTooltip player={player} item={item} show={showTooltip} tooltipId={tooltipId} />
          </>
        )}
      </Box>
    );
  },
  shouldReRenderSlot,
);

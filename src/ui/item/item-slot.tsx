import { useState, useLayoutEffect, memo } from "react";
import { useDoubleTap } from "use-double-tap";
import type { ThemeUIStyleObject } from "theme-ui";
import { resolveAsset } from "@/content/sprites/resolve-asset";
import { BuiltItem } from "@/content/items/item-types";
import type { FullCharacterWire } from "@/network";
import { assetToCanvas, Box, Icon, isMobile, Portal, theme } from "@/ui/kit";
import { SLOT_SIZE, STYLE_NON_EMPTY, STYLE_SLOT_EMPTY } from "./slot-style";
import { ItemTooltip } from "./item-tooltip";
import { SpaceDonut } from "./space-donut";
import { useSlotDrag } from "./use-slot-drag";
import { SlotAmount } from "./slot-amount";
import { shouldReRenderSlot, getIsItemActive } from "./slot-state";
import { ElementalItemArt } from "./elemental-item-art";
import { DEFAULT_ASSET_USER } from "./art-icon";
import { deriveElements } from "./weapon-elements";

const BLANK_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

/** Who armour icons are drawn for when the slot has no player (the wiki item list). */

/** Where a slot sits, passed back to its events. */
interface SlotPlace {
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
    const [hovering, setHovering] = useState(false);
    const place = item ? { item, location, slotKey, bagId, player } : undefined;
    const dropItem = (t: Element | null) => place && events?.onDrop(place, t);
    const doubleClickItem = () => place && events?.onDoubleClick(place);
    const shouldBindEvents = !!(item && events && !disabled);
    const { dragging, position, target, imageRef, dragBinds } = useSlotDrag({
      enabled: shouldBindEvents,
      onDrop: dropItem,
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
      return assetToCanvas({ asset, tint: item?.tint, setImageData });
    }, [item, profile]);

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
              {...dragBinds}
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

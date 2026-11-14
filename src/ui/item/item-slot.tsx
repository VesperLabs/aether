import { useState, useEffect, useEffectEvent, useRef, memo } from "react";
import { useDoubleTap } from "use-double-tap";
import type { ThemeUIStyleObject } from "theme-ui";
import { itemEffects, resolveAsset, type BuiltItem } from "@/content";
import type { FullCharacterWire } from "@/network";
import { Box, Icon, isMobile, Portal, RomanNumeral, theme, useAssetArt } from "@/ui/kit";
import { SLOT_SIZE, STYLE_NON_EMPTY, STYLE_SLOT_EMPTY } from "./slot-style";
import { ItemTooltip } from "./item-tooltip";
import { SpaceDonut } from "./space-donut";
import { useSlotDrag } from "./use-slot-drag";
import { SlotAmount } from "./slot-amount";
import { shouldReRenderSlot, getIsItemActive, isOverSlot } from "./slot-state";
import { ElementalItemArt } from "./elemental-item-art";
import { DEFAULT_ASSET_USER } from "./art-icon";
import { SPRING_OPEN_ATTR } from "./drag-spring-open";
import { springWiggle } from "./spring-wiggle";

import { PAD_DROP_EVENT, PAD_USE_EVENT, type PadDropEvent } from "./pad-slot-events";

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
  /** Cmd/Ctrl-clicked. */
  onLink?: (place: SlotPlace) => void;
  /** The drag moved over `target`, or ended (null). */
  onDragOver?: (place: SlotPlace, target: Element | null) => void;
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
    const [hovering, setHovering] = useState(false);
    const place = item ? { item, location, slotKey, bagId, player } : undefined;
    const dropItem = (t: Element | null) => place && events?.onDrop(place, t);
    const doubleClickItem = () => place && events?.onDoubleClick(place);
    const shouldBindEvents = !!(item && events && !disabled);
    const { dragging, position, target, imageRef, dragBinds } = useSlotDrag({
      enabled: shouldBindEvents,
      onDrop: dropItem,
    });
    const dragOver = useEffectEvent((t: Element | null) => {
      if (place) events?.onDragOver?.(place, t);
    });
    useEffect(() => {
      if (!dragging) return;
      dragOver(target);
      return () => dragOver(null);
    }, [dragging, target]);
    /* A controller picks up and places, or uses, through events on the slot */
    const slotRef = useRef<HTMLDivElement>(null);
    const onPadDrop = useEffectEvent((e: Event) => {
      if (shouldBindEvents) dropItem((e as PadDropEvent).detail);
    });
    const onPadUse = useEffectEvent(() => {
      if (shouldBindEvents) doubleClickItem();
    });
    useEffect(() => {
      const el = slotRef.current;
      if (!el) return;
      const drop = (e: Event) => onPadDrop(e);
      const use = () => onPadUse();
      el.addEventListener(PAD_DROP_EVENT, drop);
      el.addEventListener(PAD_USE_EVENT, use);
      return () => {
        el.removeEventListener(PAD_DROP_EVENT, drop);
        el.removeEventListener(PAD_USE_EVENT, use);
      };
    }, []);
    const handleMouseEnter = () => {
      setHovering(true);
    };
    const handleMouseLeave = () => {
      setHovering(false);
    };

    const profile = player?.profile;

    /* The item's art out of its texture: blank while it loads, never the last item's */
    const art = useAssetArt(
      item ? resolveAsset(item, profile ? { profile } : DEFAULT_ASSET_USER) : undefined,
      item?.tint,
    );
    const imageData = art ?? BLANK_IMAGE;

    const outerMouseBinds = {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      /* On press, not click: a Mac's ctrl-click only opens the context menu. Stops a drag too. */
      onMouseDownCapture: (e: React.MouseEvent) => {
        if (!place || !events?.onLink || !(e.metaKey || e.ctrlKey)) return;
        e.preventDefault();
        e.stopPropagation();
        events.onLink(place);
      },
      onContextMenu: (e: React.MouseEvent) => {
        if (place && events?.onLink && e.ctrlKey) e.preventDefault();
      },
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

    const elements = item?.type === "weapon" ? itemEffects(item) : [];
    const asset =
      elements.length > 0 && item
        ? resolveAsset(item, profile ? { profile } : DEFAULT_ASSET_USER)
        : undefined;
    /* Elemental weapons animate over the icon, which stays underneath to take drags and taps */
    const showElemental = !!asset && !dragging;

    const isActive = getIsItemActive({ item, player, location, slotKey });
    const tooltipId = `${location}-${item?.id ?? item?.key}`;
    const targetMoved = !isOverSlot(target, tooltipId);
    const aboutToSell = dragging && target?.closest(".menu-keeper") && location !== "shop";
    const aboutToOpen = dragging && !!target?.closest(`[${SPRING_OPEN_ATTR}]`);
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
      /* The kind of slot it goes in, so a controller's "Use" can equip it (`pad-item-menu`) */
      "data-slot-type": item?.slot ?? undefined,
      /* For a controller's "Socket": a card's mod, and the gear it could go in */
      "data-mod": item?.mod ?? undefined,
      "data-item-type": item?.type ?? undefined,
      "data-open-mods": item?.mods?.filter((mod) => !mod).length || undefined,
    };

    return (
      <Box
        ref={slotRef}
        data-tooltip-id={tooltipId}
        sx={{
          /* Only draggable slots hold on to the touch; display-only ones let a swipe scroll. */
          /* Swipes scroll the menus; a held item is dragged instead (use-slot-drag) */
          touchAction: shouldBindEvents ? "pan-y" : "auto",
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
            {item?.slot === "spell" && (
              <SlotAmount>
                <RomanNumeral value={item?.rank} />
              </SlotAmount>
            )}
            <Icon
              icon={imageData}
              size={size * 2} // Fixes large images to not get cut off
              style={{
                touchAction: shouldBindEvents ? "pan-y" : "auto",
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
                sx={aboutToOpen ? springWiggle("spring-wiggle-icon", "scale(4,4)") : undefined}
                style={{
                  opacity: dragging && !dragElemental ? 1 : 0,
                  touchAction: "none",
                  userSelect: "none",
                  pointerEvents: "none",
                  zIndex: theme.zIndices.draggable,
                  /* Back in the slot after a drag, it must not linger where it was dropped:
                   * there it would stretch the menu stack's scroll area */
                  position: dragging ? "fixed" : "absolute",
                  left: dragging ? position.x + "px" : 0,
                  top: dragging ? position.y + "px" : 0,
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
                    ...(aboutToOpen && springWiggle("spring-wiggle-art", "translate(-50%, -50%)")),
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

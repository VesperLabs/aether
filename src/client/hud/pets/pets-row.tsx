import { useEffect, useEffectEvent, useRef, useState } from "react";
import { emptyPetSlots, isPetSlot, PET_SLOTS, type PetSlot, type SavedPet } from "@/rules/capture";
import {
  ActorSprite,
  STYLE_NON_EMPTY,
  Box,
  Flex,
  Icon,
  Portal,
  SLOT_SIZE,
  STYLE_SLOT_EMPTY,
  useSlotDrag,
} from "@/ui";
import { useAppContext } from "@/client/hud/app/context";
import { PetTooltip } from "./pet-tooltip";
import { ModalReleasePet } from "./modal-release-pet";
import { PAD_DROP_EVENT, PAD_USE_EVENT, type PadDropEvent } from "@/ui/item/pad-slot-events";

/** Where pet slots are, for the controller's menu (`pad-item-menu`). */
export const PET_LOCATION = "pets";
/** Marks a pet slot with its slot id, for drops onto it. */
const SLOT_ATTR = "data-pet-slot";

/**
 * A pet's art in its slot, as item art: at most 2x (4x while it's dragged, in twice the
 * room), and less for big creatures, so it always fits.
 */
const ART_SCALE = 2;
const DRAG_SCALE = 4;
/** What an empty slot shows: the active one is who's out with you, the rest are stored. */
const EMPTY_ICON = (slot: PetSlot) => `./assets/icons/${slot === "active" ? "star" : "skull"}.png`;

/**
 * The pets you caught, a row of fixed slots like equipment's above the abilities' spells:
 * the active one, out with you, then the stored ones. Drag between slots to swap them,
 * double-click to swap one in or out, drag one onto the ground to let it go.
 */
export const PetsRow = () => {
  const { hero } = useAppContext();
  const slots = hero?.pets ?? emptyPetSlots();
  /* Dropped on the ground: asked before it's let go, in a modal over everything */
  const [releasing, setReleasing] = useState<PetSlot | null>(null);
  return (
    <Flex sx={{ gap: 2, justifyContent: "end", flexWrap: "wrap" }}>
      {PET_SLOTS.map((slot) => (
        <PetSlotView key={slot} slot={slot} pet={slots[slot]} onRelease={setReleasing} />
      ))}
      {releasing && (
        <Portal container={document.body}>
          <ModalReleasePet slot={releasing} onClose={() => setReleasing(null)} />
        </Portal>
      )}
    </Flex>
  );
};

const PetSlotView = ({
  slot,
  pet,
  onRelease,
}: {
  slot: PetSlot;
  pet: SavedPet | null;
  onRelease: (slot: PetSlot) => void;
}) => {
  const { socket } = useAppContext();
  const slotRef = useRef<HTMLDivElement>(null);
  const swap = () => {
    if (pet) socket.emit("swapPet", { slot });
  };
  const drop = (target: Element | null) => {
    if (!target || !pet) return;
    /* Onto another pet slot: moved there, swapping with what's in it */
    const to = target.closest(`[${SLOT_ATTR}]`)?.getAttribute(SLOT_ATTR);
    if (isPetSlot(to)) {
      if (to !== slot) socket.emit("movePet", { from: slot, to });
      return;
    }
    /* The ground: let go there, as an item is dropped */
    if (target.nodeName === "CANVAS") onRelease(slot);
  };
  const { dragging, position, imageRef, dragBinds } = useSlotDrag({
    enabled: !!pet,
    onDrop: drop,
  });
  /* A controller sends these, standing in for a drag and a double-click */
  const onPadDrop = useEffectEvent((e: Event) => drop((e as PadDropEvent).detail));
  const onPadUse = useEffectEvent(swap);
  useEffect(() => {
    const el = slotRef.current;
    if (!el) return;
    const padDrop = (e: Event) => onPadDrop(e);
    const padUse = () => onPadUse();
    el.addEventListener(PAD_DROP_EVENT, padDrop);
    el.addEventListener(PAD_USE_EVENT, padUse);
    return () => {
      el.removeEventListener(PAD_DROP_EVENT, padDrop);
      el.removeEventListener(PAD_USE_EVENT, padUse);
    };
  }, []);

  const tooltipId = `pet-${slot}`;
  const isActive = slot === "active";
  return (
    /* The active slot is marked with a star on its corner */
    <Box sx={{ position: "relative" }}>
      <Flex
        ref={slotRef}
        {...dragBinds}
        onDoubleClick={swap}
        /* A slot to drops and to the controller's highlight, with its own menu on a held A */
        {...{ [SLOT_ATTR]: slot }}
        data-slot-key={`pet-${slot}`}
        data-location={PET_LOCATION}
        data-id={pet?.id}
        data-tooltip-id={pet ? tooltipId : undefined}
        sx={{
          /* As an equipment slot: a filled one in its rarity's colours, an empty one greyed out */
          ...(pet ? STYLE_NON_EMPTY({ rarity: "common" }) : STYLE_SLOT_EMPTY(EMPTY_ICON(slot))),
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          cursor: pet ? (dragging ? "grabbing" : "grab") : "default",
          userSelect: "none",
        }}
      >
        {pet && !dragging && <PetTooltip tooltipId={tooltipId} slot={slot} pet={pet} />}
        {/* While it's dragged, a faded grey copy stays behind in the slot, as an item's does */}
        {pet && dragging && (
          <Box sx={{ opacity: 0.5, filter: "grayscale(100%)", lineHeight: 0 }}>
            <ActorSprite name={pet.name} size={SLOT_SIZE} maxScale={ART_SCALE} />
          </Box>
        )}
        {pet && (
          <Portal container={dragging ? document.body : null}>
            <Box
              ref={imageRef}
              sx={{
                pointerEvents: "none",
                /* Always a slot's size, the art centred in it however big it's drawn: the drag
                 centres this box on the cursor by its size when picked up, before the art grows */
                width: SLOT_SIZE,
                height: SLOT_SIZE,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...(dragging && {
                  position: "fixed",
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  zIndex: "draggable",
                }),
              }}
            >
              <ActorSprite
                name={pet.name}
                size={dragging ? SLOT_SIZE * 2 : SLOT_SIZE}
                maxScale={dragging ? DRAG_SCALE : ART_SCALE}
              />
            </Box>
          </Portal>
        )}
      </Flex>
      {isActive && pet && (
        <Icon
          icon="./assets/icons/star.png"
          size={24}
          sx={{ position: "absolute", top: "-8px", left: "-8px", pointerEvents: "none", zIndex: 1 }}
        />
      )}
    </Box>
  );
};

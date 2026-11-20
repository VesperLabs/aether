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
import { actors, isActorId, type ActorDefinition } from "@/content";
import { npcStats } from "@/rules/stats";
import { useNpcPlates } from "@/client/hud/menu/use-npc-plates";
import { HealthPip } from "./health-pip";
import { PetTooltip, type PetHealth } from "./pet-tooltip";
import { ModalReleasePet } from "./modal-release-pet";
import { PAD_DROP_EVENT, PAD_USE_EVENT, type PadDropEvent } from "@/ui/item/pad-slot-events";

/** Faded and grey: a dragged pet's ghost, and a put-away active pet and its star. */
const FADED_STYLE = { filter: "grayscale(100%)" };
/** What stays in the slot while it's dragged: the same see-through grey an item leaves behind. */
const LEFT_BEHIND_STYLE = { filter: "grayscale(100%)", opacity: 0.5 };

/** Two presses on a slot within this many ms are a double-click. */
const DOUBLE_PRESS_MS = 300;

/** Where pet slots are, for the controller's menu (`pad-item-menu`). */
export const PET_LOCATION = "pets";
/** Marks a pet slot with its slot id, for drops onto it. */
const SLOT_ATTR = "data-pet-slot";

/**
 * A pet's art: 1x in its slot and 2x while it's dragged, the same for every pet, so all share one
 * pixel size and their sizes compare as in the game. One too big for its slot even at 1x shrinks.
 */
const ART_SCALE = 1;
const DRAG_SCALE = 2;
/** What an empty slot shows: the active one is who's out with you, the rest are stored. */
const EMPTY_ICON = (slot: PetSlot) => `./assets/icons/${slot === "active" ? "star" : "skull"}.png`;

/**
 * The pets you caught, a row of fixed slots like equipment's above the abilities' spells:
 * the active one, out with you, then the stored ones. Drag between slots to swap them,
 * double-click a stored one to swap it in or the active one to put it away and back, drag one
 * onto the ground to let it go.
 */
export const PetsRow = () => {
  const { hero } = useAppContext();
  const slots = hero?.pets ?? emptyPetSlots();
  /* The pet that's out is live in the world: its plate has its HP as it is now */
  const { owned } = useNpcPlates();
  /* Dropped on the ground: asked before it's let go, in a modal over everything */
  const [releasing, setReleasing] = useState<PetSlot | null>(null);
  return (
    <Flex sx={{ gap: 2, justifyContent: "end", flexWrap: "wrap" }}>
      {PET_SLOTS.map((slot) => (
        <PetSlotView
          key={slot}
          slot={slot}
          pet={slots[slot]}
          live={owned.find((npc) => npc.petId && npc.petId === slots[slot]?.id)?.stats}
          onRelease={setReleasing}
        />
      ))}
      {releasing && (
        <Portal container={document.body}>
          <ModalReleasePet slot={releasing} onClose={() => setReleasing(null)} />
        </Portal>
      )}
    </Flex>
  );
};

/**
 * A pet's HP: live while it's out; stored, its saved share of the max HP it comes out with,
 * rounded as it comes out (never below 1).
 */
function petHealth(pet: SavedPet, live?: PetHealth): PetHealth | undefined {
  if (live) return { hp: live.hp, maxHp: live.maxHp };
  const actor = isActorId(pet.name) ? (actors[pet.name] as ActorDefinition) : undefined;
  const maxHp = actor ? npcStats(actor).maxHp : 0;
  if (!maxHp) return undefined;
  return { hp: Math.max(1, Math.round(maxHp * (pet.hp ?? 1))), maxHp };
}

const PetSlotView = ({
  slot,
  pet,
  live,
  onRelease,
}: {
  slot: PetSlot;
  pet: SavedPet | null;
  /** The pet's stats out in the world, when it's out. */
  live?: PetHealth;
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

  /* Two presses close together are a double-click. Counted on the press, not the click: the
   * press starts a drag that carries the art off into a portal, so no click ever lands */
  const lastPress = useRef(-Infinity);
  const onPress = () => {
    const now = performance.now();
    if (now - lastPress.current < DOUBLE_PRESS_MS) {
      lastPress.current = -Infinity;
      swap();
    } else lastPress.current = now;
  };
  const pressBinds = pet
    ? {
        onMouseDown: (e: React.MouseEvent) => {
          onPress();
          dragBinds.onMouseDown?.(e);
        },
        onTouchStart: (e: React.TouchEvent) => {
          onPress();
          dragBinds.onTouchStart?.(e);
        },
      }
    : {};

  const tooltipId = `pet-${slot}`;
  const health = pet ? petHealth(pet, live) : undefined;
  const isActive = slot === "active";
  /* The active one put away: it stays in its slot, greyed like a dragged pet's ghost, star too */
  const isAway = !!pet?.isAway;
  return (
    /* The active slot is marked with a star on its corner */
    <Box sx={{ position: "relative" }}>
      <Flex
        ref={slotRef}
        {...dragBinds}
        {...pressBinds}
        /* A slot to drops and to the controller's highlight, with its own menu on a held A */
        {...{ [SLOT_ATTR]: slot }}
        data-slot-key={`pet-${slot}`}
        data-location={PET_LOCATION}
        data-id={pet?.id}
        data-away={isAway || undefined}
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
        {pet && !dragging && (
          <PetTooltip tooltipId={tooltipId} slot={slot} pet={pet} health={health} />
        )}
        {/* While it's dragged, a faded grey copy stays behind in the slot, as an item's does */}
        {pet && dragging && (
          <Box sx={{ ...LEFT_BEHIND_STYLE, lineHeight: 0 }}>
            <ActorSprite name={pet.name} size={SLOT_SIZE} maxScale={ART_SCALE} wholeSteps />
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
                ...(isAway && !dragging && FADED_STYLE),
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
                /* On whole pixels, in its slot or picked up: a fraction would blur it */
                wholeSteps
              />
            </Box>
          </Portal>
        )}
      </Flex>
      {pet && !dragging && (
        <HealthPip share={health ? health.hp / health.maxHp : 1} slotSize={SLOT_SIZE} />
      )}
      {isActive && pet && (
        <Icon
          icon="./assets/icons/star.png"
          size={24}
          sx={{
            position: "absolute",
            top: "-8px",
            left: "-8px",
            pointerEvents: "none",
            zIndex: 1,
            ...(isAway && FADED_STYLE),
          }}
        />
      )}
    </Box>
  );
};

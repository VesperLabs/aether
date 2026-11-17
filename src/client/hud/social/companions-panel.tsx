import { useEffect, useEffectEvent, useRef, useState } from "react";
import { actors, isActorId, type ActorDefinition } from "@/content";
import { MAX_COMPANIONS, type SavedCompanion } from "@/rules/capture";
import {
  ActorSprite,
  BASE_SLOT_STYLE,
  Box,
  Button,
  Flex,
  Portal,
  SLOT_SIZE,
  Text,
  useSlotDrag,
} from "@/ui";
import { useAppContext } from "@/client/hud/app/context";
import { PAD_DROP_EVENT, PAD_USE_EVENT, type PadDropEvent } from "@/ui/item/pad-slot-events";

/** Where companion slots are, for the controller's menu (`pad-item-menu`). */
export const COMPANION_LOCATION = "companions";

/** A companion drawn in its slot; bigger while it is being dragged. */
const SPRITE_SIZE = 40;

const nameOf = (name: string) =>
  isActorId(name) ? (actors[name] as ActorDefinition).profile.userName : name;

/**
 * The companions you caught, one slot each up to how many you can keep. Click one to bring it out
 * or put it away; drag it onto the ground to let it go (its tooltip says so).
 */
export const CompanionsPanel = () => {
  const { hero } = useAppContext();
  const companions = hero?.companions ?? [];
  const empty = Math.max(0, MAX_COMPANIONS - companions.length);
  return (
    <Flex sx={{ flexDirection: "column", gap: 2 }}>
      {companions.map((companion) => (
        <CompanionSlot key={companion.id} companion={companion} />
      ))}
      {Array.from({ length: empty }, (_, i) => (
        <Flex key={i} sx={{ alignItems: "center", gap: 2 }}>
          <Box sx={{ ...BASE_SLOT_STYLE, opacity: 0.5 }} />
          <SlotLabel title="No companion yet" detail="Throw a ball at a wild creature" />
        </Flex>
      ))}
    </Flex>
  );
};

const CompanionSlot = ({ companion }: { companion: SavedCompanion }) => {
  const { socket } = useAppContext();
  const slotRef = useRef<HTMLDivElement>(null);
  const [releasing, setReleasing] = useState(false);
  const name = nameOf(companion.name);
  const toggle = () => socket.emit("toggleCompanion", { id: companion.id });
  const drop = (target: Element | null) => {
    /* The ground: the game, or the dimmed game under the menu's overlay, anywhere off the menu */
    const menu = slotRef.current?.closest(".modal-body")?.parentElement;
    if (target && !menu?.contains(target)) setReleasing(true);
  };
  const { dragging, position, imageRef, dragBinds } = useSlotDrag({
    enabled: !releasing,
    onDrop: drop,
  });
  /* A controller's menu sends these, standing in for a drag to the ground and a double-click */
  const onPadDrop = useEffectEvent((e: Event) => drop((e as PadDropEvent).detail));
  const onPadUse = useEffectEvent(toggle);
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

  return (
    <Flex sx={{ alignItems: "center", gap: 2 }}>
      <Flex
        ref={slotRef}
        {...dragBinds}
        onDoubleClick={toggle}
        /* A slot to the controller's highlight, with its own menu on a held A */
        data-slot-key={`companion-${companion.id}`}
        data-location={COMPANION_LOCATION}
        data-id={companion.id}
        data-away={companion.isAway ? "" : undefined}
        data-tooltip-id="hud"
        data-tooltip-content={`Double-click to ${companion.isAway ? "bring out" : "put away"}. Drag to the ground to release.`}
        sx={{
          ...BASE_SLOT_STYLE,
          alignItems: "center",
          justifyContent: "center",
          cursor: dragging ? "grabbing" : "grab",
          opacity: companion.isAway || dragging ? 0.5 : 1,
          userSelect: "none",
        }}
      >
        <Portal container={dragging ? document.body : null}>
          <Box
            ref={imageRef}
            sx={{
              pointerEvents: "none",
              ...(dragging && {
                position: "fixed",
                left: `${position.x}px`,
                top: `${position.y}px`,
                zIndex: "draggable",
              }),
            }}
          >
            <ActorSprite name={companion.name} size={dragging ? SLOT_SIZE : SPRITE_SIZE} />
          </Box>
        </Portal>
      </Flex>
      {releasing ? (
        <Flex sx={{ flexDirection: "column", gap: 1, flex: 1 }}>
          <Text sx={{ fontSize: 1 }}>Release {name} for good?</Text>
          <Flex sx={{ gap: 1 }}>
            <Button
              onClick={() => {
                socket.emit("releaseCompanion", { id: companion.id });
                setReleasing(false);
              }}
            >
              Release
            </Button>
            <Button onClick={() => setReleasing(false)}>Keep</Button>
          </Flex>
        </Flex>
      ) : (
        <SlotLabel title={name} detail={companion.isAway ? "Put away" : "Out with you"} />
      )}
    </Flex>
  );
};

/** A slot's name, with a quieter line under it. */
const SlotLabel = ({ title, detail }: { title: string; detail: string }) => (
  <Flex sx={{ flexDirection: "column" }}>
    <Text sx={{ fontSize: 1, fontWeight: 700 }}>{title}</Text>
    <Text sx={{ fontSize: 0, color: "gray.400" }}>{detail}</Text>
  </Flex>
);

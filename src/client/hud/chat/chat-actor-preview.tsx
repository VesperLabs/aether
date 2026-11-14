import { useMemo, useRef, useState } from "react";
import { actors, getCatalogItem, type ActorDefinition, type BuiltItem } from "@/content";
import { Box, PlayerRender, type RenderablePlayer } from "@/ui";

const ACTORS = actors as Record<string, ActorDefinition>;
/* Held weapons and shields stick out past the icon, so the preview leaves them off */
const WEAPON_SLOTS = ["handLeft", "handRight"];
/** The rows with anything drawn on them: from the top of the hair or hat to the feet. */
const drawnRows = (canvas: HTMLCanvasElement) => {
  const { data, width, height } = canvas
    .getContext("2d")!
    .getImageData(0, 0, canvas.width, canvas.height);
  let top: number | undefined;
  let bottom = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!data[(y * width + x) * 4 + 3]) continue;
      top ??= y;
      bottom = y;
      break;
    }
  }
  return top === undefined ? undefined : { top, bottom };
};

/** Fits the drawn rows in the box, centered, so a tall hat just zooms the whole figure out. */
const fitTransform = ({ top, bottom }: { top: number; bottom: number }, size: number) => {
  const scale = size / (bottom - top + 1);
  /* PlayerRender draws at twice the sprite's size, centered on its 50th canvas row */
  const shift = -((top + bottom + 1) / 2 - 50) * scale;
  return `translateY(${shift}px) scale(${scale / 2})`;
};

/** An actor as the renderer draws it: its look, wearing all its gear except what it holds. */
const dressedActor = (actor: ActorDefinition): RenderablePlayer => {
  const equipment = Object.fromEntries(
    Object.entries(actor.equipment ?? {}).flatMap(([slot, ref]) => {
      if (!ref || WEAPON_SLOTS.includes(slot)) return [];
      const item = getCatalogItem(ref);
      /* Only the look is drawn, so the unbuilt catalog item does */
      return item ? [[slot, item as BuiltItem]] : [];
    }),
  );
  /* The renderer only draws slots listed as active */
  return { profile: actor.profile, equipment, activeItemSlots: Object.keys(equipment) };
};

/** A small figure of an actor in its gear, for the `/npc` suggestions. */
export const ChatActorPreview = ({ actorId, size = 24 }: { actorId: string; size?: number }) => {
  const actor = ACTORS[actorId];
  /* Built once: a new object each render would make the renderer redraw */
  const player = useMemo(() => actor && dressedActor(actor), [actor]);
  const box = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<{ top: number; bottom: number }>();
  const onLoadComplete = () => {
    const canvas = box.current?.querySelector("canvas");
    if (canvas) setRows(drawnRows(canvas));
  };
  if (!player) return <Box />;
  return (
    <Box
      ref={box}
      sx={{
        position: "relative",
        width: size,
        height: size,
        overflow: "hidden",
      }}
    >
      {/* Hidden until measured, so it doesn't jump into place */}
      <PlayerRender
        player={player}
        onLoadComplete={onLoadComplete}
        sx={{
          width: size,
          height: size,
          visibility: rows ? "visible" : "hidden",
          transform: rows && fitTransform(rows, size),
        }}
      />
    </Box>
  );
};

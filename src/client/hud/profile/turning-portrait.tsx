import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Button, DIRECTIONS, Flex, PlayerPortrait, type RenderablePlayer } from "@/ui";

/** How far a drag goes for a quarter turn, px. */
const DRAG_PER_TURN = 40;
/** Spin left after letting go, kept each frame (at 60fps). */
const FRICTION = 0.92;
/** Below this, in turns per frame, the spin settles onto the nearest side. */
const SETTLE_SPEED = 0.02;
/** How much of the way to the side it settles on it closes each frame. */
const SNAP = 0.25;
/** Facing the viewer: where `DIRECTIONS` puts the front. */
const FRONT = DIRECTIONS.indexOf("down");

/** The side shown at a turn: turning right goes front, its right, back, its left. */
const facingAt = (turn: number) => {
  const index = (((FRONT - Math.round(turn)) % 4) + 4) % 4;
  return DIRECTIONS[index];
};

/**
 * The character on a turntable: drag it to spin it, fling it to keep it spinning a while, or step
 * a quarter turn with the arrows. It always comes to rest showing one of its four sides.
 */
export const TurningPortrait = ({
  player,
  filteredSlots,
  width,
  height,
}: {
  player: RenderablePlayer;
  filteredSlots?: string[];
  width: number;
  height: number;
}) => {
  const [turn, setTurn] = useState(0);
  /* The live spin, outside React so a drag or a fling never waits on a render */
  const spin = useRef({ turn: 0, speed: 0, target: 0, dragX: undefined as number | undefined });
  const frame = useRef<number>(undefined);

  const animate = () => {
    const s = spin.current;
    if (s.dragX === undefined) {
      if (Math.abs(s.speed) > SETTLE_SPEED) {
        s.turn += s.speed;
        s.speed *= FRICTION;
        s.target = Math.round(s.turn);
      } else {
        s.speed = 0;
        s.turn += (s.target - s.turn) * SNAP;
        if (Math.abs(s.target - s.turn) < 0.01) s.turn = s.target;
      }
    }
    setTurn(s.turn);
    frame.current =
      s.dragX !== undefined || s.speed !== 0 || s.turn !== s.target
        ? requestAnimationFrame(animate)
        : undefined;
  };
  const wake = () => {
    if (frame.current === undefined) frame.current = requestAnimationFrame(animate);
  };
  useEffect(() => () => cancelAnimationFrame(frame.current ?? 0), []);

  const step = (by: number) => {
    const s = spin.current;
    s.speed = 0;
    s.target = Math.round(s.target) + by;
    wake();
  };

  const onPointerDown = (e: PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    Object.assign(spin.current, { dragX: e.clientX, speed: 0 });
    wake();
  };
  const onPointerMove = (e: PointerEvent) => {
    const s = spin.current;
    if (s.dragX === undefined) return;
    const moved = (e.clientX - s.dragX) / DRAG_PER_TURN;
    s.turn += moved;
    /* Smoothed, so the fling follows the last few moves rather than the very last one */
    s.speed = s.speed * 0.5 + moved * 0.5;
    s.dragX = e.clientX;
  };
  const onPointerUp = () => {
    const s = spin.current;
    s.dragX = undefined;
    s.target = Math.round(s.turn);
    wake();
  };

  return (
    <Flex sx={{ flexShrink: 0, flexDirection: "column", alignItems: "center", gap: 1 }}>
      <Flex
        title="Drag to turn"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        sx={{
          width,
          height,
          alignItems: "flex-end",
          justifyContent: "center",
          cursor: "grab",
          touchAction: "none",
          userSelect: "none",
          "&:active": { cursor: "grabbing" },
        }}
      >
        <PlayerPortrait
          player={player}
          scale={3}
          shadow
          facing={facingAt(turn)}
          filteredSlots={filteredSlots}
          sx={{ pointerEvents: "none" }}
        />
      </Flex>
      <Flex sx={{ gap: 2 }}>
        <Button aria-label="Turn left" onClick={() => step(-1)}>
          ◀
        </Button>
        <Button aria-label="Turn right" onClick={() => step(1)}>
          ▶
        </Button>
      </Flex>
    </Flex>
  );
};

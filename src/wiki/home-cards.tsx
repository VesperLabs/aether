import { Box, Flex, Text } from "@/ui";
import { memo, startTransition, useEffect, useRef, useState, type PointerEvent } from "react";
import { Link } from "wouter";
import { useCardPool, type FeaturedCard } from "./card-pool";
import { TAB_BAR_SPACE } from "./menu-bar";
import { PAPER, PAPER_STYLE, PaperFrame } from "./paper";

const CARD_WIDTH = 260;
const CARD_GAP = 16;
const STEP = CARD_WIDTH + CARD_GAP;
/** Scroll speed, in pixels per second. */
const SPEED = 40;
/** Keeps the row above the footer bar. */
const FOOTER_HEIGHT = 32;
/** Extra cards rendered off-screen on each side, so new ones mount before they come into view. */
const OVERSCAN = 2;

/** Enough cards to span the window plus one waiting off-screen on each side. */
const cardsToFill = () => Math.ceil(window.innerWidth / STEP) + 2;

/**
 * The card at each slot of the endless row, picked the first time the slot comes near the screen
 * and kept, so scrolling back shows the same cards. Each pick avoids its on-screen neighbours.
 */
function cardAt(slots: Map<number, FeaturedCard>, pool: FeaturedCard[], slot: number) {
  const known = slots.get(slot);
  if (known) return known;
  const near = new Set<string>();
  for (let i = slot - cardsToFill(); i <= slot + cardsToFill(); i++) {
    const card = slots.get(i);
    if (card) near.add(card.id);
  }
  const fresh = pool.filter((card) => !near.has(card.id));
  const from = fresh.length ? fresh : pool;
  const card = from[Math.floor(Math.random() * from.length)];
  slots.set(slot, card);
  return card;
}

/**
 * A row of cards pinned to the bottom of the screen, scrolling sideways forever in both directions.
 * Only the cards near the screen are rendered.
 */
export const HomeCards = () => {
  const pool = useCardPool();
  const [slots] = useState(() => new Map<number, FeaturedCard>());
  /** The leftmost rendered slot, one off-screen. */
  const [first, setFirst] = useState(-OVERSCAN);
  const [count, setCount] = useState(cardsToFill);
  const trackRef = useRef<HTMLDivElement>(null);
  const paused = useRef(false);

  /* A wider window needs more cards, or new ones would appear on screen. */
  useEffect(() => {
    const onResize = () => setCount(cardsToFill());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* Wheel and trackpad scrolling over the row, applied on the next frame. */
  const scrolled = useRef(0);
  const rowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      scrolled.current +=
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    };
    row.addEventListener("wheel", onWheel, { passive: false });
    return () => row.removeEventListener("wheel", onWheel);
  }, []);

  /* Touch swiping drags the row; a swipe that moved isn't also a tap on the card under it. */
  const dragX = useRef<number | null>(null);
  const dragged = useRef(0);
  /* Finger speed in px/ms, kept after release so a flick coasts to a stop. */
  const velocity = useRef(0);
  const lastMove = useRef(0);
  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragX.current = event.clientX;
    lastMove.current = event.timeStamp;
    dragged.current = 0;
    velocity.current = 0;
  };
  const onPointerMove = (event: PointerEvent) => {
    if (dragX.current === null) return;
    const dx = event.clientX - dragX.current;
    const dt = Math.max(1, event.timeStamp - lastMove.current);
    dragX.current = event.clientX;
    lastMove.current = event.timeStamp;
    dragged.current += Math.abs(dx);
    scrolled.current -= dx;
    /* Smoothed, so one jittery sample doesn't decide the flick. */
    velocity.current = velocity.current * 0.6 + (dx / dt) * 0.4;
  };
  const onPointerUp = (event: PointerEvent) => {
    if (dragX.current === null) return;
    dragX.current = null;
    /* A finger that stopped before lifting shouldn't fling. */
    if (event.timeStamp - lastMove.current > 80) velocity.current = 0;
  };

  useEffect(() => {
    let offset = 0;
    let shown = -OVERSCAN;
    let last = performance.now();
    let frame = requestAnimationFrame(function move(now) {
      const dt = now - last;
      const touching = dragX.current !== null;
      const coasting = !touching && Math.abs(velocity.current) > 0.02;
      if (coasting) {
        offset += velocity.current * dt;
        velocity.current *= Math.pow(0.995, dt);
      } else if (!touching) velocity.current = 0;
      if (!paused.current && !touching && !coasting) offset -= (SPEED * dt) / 1000;
      offset -= scrolled.current;
      scrolled.current = 0;
      last = now;
      /* Only re-render when a card crosses a slot, and at low priority so mounting the next card
         never holds up a frame of scrolling. */
      const leftmost = Math.floor(-offset / STEP) - OVERSCAN;
      if (leftmost !== shown) {
        shown = leftmost;
        startTransition(() => setFirst(leftmost));
      }
      if (trackRef.current) trackRef.current.style.transform = `translateX(${offset}px)`;
      frame = requestAnimationFrame(move);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <Box
      ref={rowRef}
      /* Mouse only: taps fire an enter with no leave, which would pause the row for good. */
      onPointerEnter={(event) => (paused.current = event.pointerType === "mouse")}
      onPointerLeave={() => (paused.current = false)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={(event) => {
        if (dragged.current > 8) event.preventDefault();
        dragged.current = 0;
      }}
      sx={{
        position: "fixed",
        left: 0,
        right: 0,
        /* Above the footer, or on phones the tab bar (which holds the footer's credit). */
        bottom: [TAB_BAR_SPACE, FOOTER_HEIGHT],
        zIndex: 1,
        overflow: "hidden",
        /* Sideways swipes drive the row; vertical ones still scroll the page. */
        touchAction: "pan-y",
        /* Room for the art rising out of the cards. */
        pt: 6,
        pb: 3,
      }}
    >
      <Flex
        ref={trackRef}
        sx={{ gap: `${CARD_GAP}px`, width: "max-content", px: 3, willChange: "transform" }}
        /* Shifts the rendered cards to their slots, so cards entering or leaving never move the rest. */
        style={{ marginLeft: first * STEP }}
      >
        {Array.from({ length: count + OVERSCAN * 2 }, (_, i) => first + i).map((slot) => (
          <Box key={slot} sx={{ width: CARD_WIDTH, flexShrink: 0, contain: "layout style" }}>
            <PaperCard {...cardAt(slots, pool, slot)} />
          </Box>
        ))}
      </Flex>
    </Box>
  );
};

/** A small faded star either side of the category. */
const Glyph = () => (
  <Box as="span" aria-hidden sx={{ fontSize: "0.75em", opacity: 0.3, mx: 2 }}>
    ✦
  </Box>
);

const ONE_LINE = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

/** Memoized so cards already on screen don't re-render (and redraw their art) when one spawns. */
const PaperCard = memo(({ title, category, info, href, color, art }: FeaturedCard) => {
  const card = (
    <Box
      sx={{
        height: "100%",
        px: 4,
        pt: 0,
        pb: 4,
        textAlign: "center",
        ...PAPER_STYLE,
        transition: "transform .15s",
        "&:hover": { transform: "translateY(-2px)" },
      }}
    >
      <PaperFrame />
      <Flex
        sx={{
          height: 96,
          mt: -5,
          mb: 1,
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        {art()}
      </Flex>
      <Text as="h3" sx={{ fontSize: 4, fontWeight: 700, m: 0, mb: 2, ...ONE_LINE }}>
        {title}
      </Text>
      <Text
        as="p"
        sx={{
          color: PAPER.muted,
          fontSize: 1,
          lineHeight: 1.5,
          m: 0,
          /* Two lines at most, always reserved so every card is the same height. */
          minHeight: "3em",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {info}
      </Text>
      <Text as="p" sx={{ color, fontSize: 1, fontWeight: 600, m: 0, mt: 2, ...ONE_LINE }}>
        <Glyph />
        {category}
        <Glyph />
      </Text>
    </Box>
  );
  return <Link href={href}>{card}</Link>;
});

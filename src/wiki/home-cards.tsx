import { Box, Flex, Text } from "@/ui";
import { memo, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useCardPool, type FeaturedCard } from "./card-pool";
import { PAPER, PAPER_STYLE, PaperFrame } from "./paper";

const CARD_WIDTH = 260;
const CARD_GAP = 16;
const STEP = CARD_WIDTH + CARD_GAP;
/** Scroll speed, in pixels per second. */
const SPEED = 40;
/** Keeps the row above the footer bar. */
const FOOTER_HEIGHT = 32;

/** A card on screen; `slot` is its position in the endless row, counting from the first card ever shown. */
type Spawned = { uid: number; slot: number; card: FeaturedCard };

/** Enough cards to span the window plus one waiting off-screen on each side. */
const cardsToFill = () => Math.ceil(window.innerWidth / STEP) + 2;

/** The row with any missing cards added on the right, past the screen edge. */
function topUp(pool: FeaturedCard[], showing: Spawned[]) {
  const row = [...showing];
  while (row.length < cardsToFill()) row.push(spawn(pool, row));
  return row;
}

let nextUid = 0;
/** A random card from the pool that isn't already on screen. */
function spawn(pool: FeaturedCard[], showing: Spawned[]): Spawned {
  const slot = showing.length ? showing[showing.length - 1].slot + 1 : 0;
  const shown = new Set(showing.map((s) => s.card.id));
  const fresh = pool.filter((card) => !shown.has(card.id));
  const from = fresh.length ? fresh : pool;
  return { uid: nextUid++, slot, card: from[Math.floor(Math.random() * from.length)] };
}

/**
 * A row of cards pinned to the bottom of the screen, scrolling sideways forever. Each card that
 * leaves on the left is replaced by a new random one from the pool on the right.
 */
export const HomeCards = () => {
  const pool = useCardPool();
  const poolRef = useRef(pool);
  useEffect(() => {
    poolRef.current = pool;
  }, [pool]);
  const [cards, setCards] = useState<Spawned[]>(() => topUp(pool, []));
  const trackRef = useRef<HTMLDivElement>(null);
  const paused = useRef(false);

  /* A wider window needs more cards, or new ones would appear on screen. */
  useEffect(() => {
    const onResize = () => setCards((showing) => topUp(poolRef.current, showing));
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

  useEffect(() => {
    const drifts = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    /* Departed cards are swapped for an equal spacer (see the track's padding), so removing
       them never shifts the cards still on screen. Scrolling back stops at the first card left. */
    let offset = 0;
    let departed = 0;
    let last = performance.now();
    let frame = requestAnimationFrame(function move(now) {
      if (drifts && !paused.current) offset -= (SPEED * (now - last)) / 1000;
      offset = Math.min(offset - scrolled.current, -departed * STEP);
      scrolled.current = 0;
      last = now;
      while (offset + (departed + 1) * STEP < 0) {
        departed++;
        setCards((showing) => topUp(poolRef.current, showing.slice(1)));
      }
      if (trackRef.current) trackRef.current.style.transform = `translateX(${offset}px)`;
      frame = requestAnimationFrame(move);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <Box
      ref={rowRef}
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      sx={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: FOOTER_HEIGHT,
        zIndex: 1,
        overflow: "hidden",
        /* Room for the art rising out of the cards. */
        pt: 6,
        pb: 3,
      }}
    >
      <Flex
        ref={trackRef}
        sx={{ gap: `${CARD_GAP}px`, width: "max-content", px: 3, willChange: "transform" }}
        style={{ paddingLeft: `calc(${(cards[0]?.slot ?? 0) * STEP}px + 16px)` }}
      >
        {cards.map(({ uid, card }) => (
          <Box key={uid} sx={{ width: CARD_WIDTH, flexShrink: 0 }}>
            <PaperCard {...card} />
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

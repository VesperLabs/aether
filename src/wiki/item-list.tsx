import { Box } from "@/ui";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ItemCard, type WikiItem } from "./item-card";
import { getHashId } from "./use-hash-scroll";

/** Space between cards, in pixels. */
const GAP = 8;
/** A card's height before it's been measured. */
const GUESS = 160;

/**
 * The item cards, virtualized against the page's own scroll: only the cards near the screen are
 * mounted, so filtering swaps a handful of cards instead of hundreds.
 */
export const ItemList = ({ items }: { items: WikiItem[] }) => {
  const listRef = useRef<HTMLDivElement>(null);
  /* Where the list starts on the page, so the virtualizer knows which cards are on screen. */
  const [top, setTop] = useState(0);
  useLayoutEffect(() => {
    const measure = () => {
      const list = listRef.current;
      if (list) setTop(list.getBoundingClientRect().top + window.scrollY);
    };
    measure();
    /* The header and filters above can wrap to a different height when the window resizes. */
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  /* The virtualizer hands back fresh positions on every scroll, which memoizing would freeze. */
  // oxlint-disable-next-line react/incompatible-library
  const virtualizer = useWindowVirtualizer({
    count: items.length,
    estimateSize: () => GUESS,
    gap: GAP,
    overscan: 4,
    scrollMargin: top,
    getItemKey: (index) => key(items[index]),
  });

  /* Only cards near the screen exist, so the list has to go to the one the URL names. */
  useEffect(() => {
    const index = items.findIndex((item) => key(item) === getHashId());
    if (top && index >= 0) virtualizer.scrollToIndex(index, { align: "center" });
    // Once the list knows where it starts; filtering afterwards shouldn't jump back.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [top]);

  return (
    <Box ref={listRef} sx={{ position: "relative" }} style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((row) => (
        <Box
          key={row.key}
          data-index={row.index}
          ref={virtualizer.measureElement}
          sx={{ position: "absolute", top: 0, left: 0, width: "100%" }}
          style={{ transform: `translateY(${row.start - top}px)` }}
        >
          <ItemCard item={items[row.index]} />
        </Box>
      ))}
    </Box>
  );
};

const key = (item: WikiItem) => `${item.type}-${item.rarity}-${item.key}`;

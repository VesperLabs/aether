import { useEffect, useRef, type ComponentProps } from "react";
import { Box } from "theme-ui";

/** How far the content fades out at an edge that has more to scroll to. */
const FADE = 16;

/**
 * A scrolling box whose content fades out at an edge only while there is more past it, so a
 * list reads as cut off rather than ending. Put it inside a panel, not on it: the mask fades
 * everything it covers, background included.
 */
export const ScrollFade = ({ sx, ...props }: ComponentProps<typeof Box>) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const below = el.scrollHeight - el.clientHeight - el.scrollTop;
      el.style.setProperty("--fade-top", `${Math.min(el.scrollTop, FADE)}px`);
      el.style.setProperty("--fade-bottom", `${Math.min(Math.max(below, 0), FADE)}px`);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    /* Content changes size too: a tab shown, a list grown */
    const resize = new ResizeObserver(update);
    resize.observe(el);
    for (const child of el.children) resize.observe(child);
    return () => {
      el.removeEventListener("scroll", update);
      resize.disconnect();
    };
  }, []);

  return (
    <Box
      ref={ref}
      sx={{
        /* Positioned, so what's laid out against it (a controller's highlight) scrolls with it */
        position: "relative",
        overflowY: "auto",
        overflowX: "hidden",
        maskImage: `linear-gradient(to bottom, transparent, #000 var(--fade-top, 0px),
          #000 calc(100% - var(--fade-bottom, 0px)), transparent)`,
        ...sx,
      }}
      {...props}
    />
  );
};

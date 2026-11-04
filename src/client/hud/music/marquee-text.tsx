import { useLayoutEffect, useRef, useState } from "react";
import type { ThemeUICSSObject } from "theme-ui";
import { Box } from "@/ui";

/** Space between the end of the text and its repeat. */
const GAP = 24;
const PIXELS_PER_SECOND = 20;

interface MarqueeTextProps {
  text: string;
  /** Quieter detail after the text, such as a timer. Its digits keep their width as it ticks. */
  trailing?: string;
  /** Pause while hidden, so nothing animates behind a closed panel. */
  running: boolean;
  sx?: ThemeUICSSObject;
}

/** One line of text that loops sideways when it doesn't fit, and sits still when it does. */
export const MarqueeText = ({ text, trailing, running, sx }: MarqueeTextProps) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  /* The distance of one loop, or 0 when the text fits. */
  const [loopWidth, setLoopWidth] = useState(0);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const label = textRef.current;
    if (!box || !label) return;
    const measure = () =>
      setLoopWidth(label.offsetWidth > box.clientWidth ? label.offsetWidth + GAP : 0);
    measure();
    /* The label resizes when the game font finishes loading. */
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    observer.observe(label);
    return () => observer.disconnect();
  }, [text]);

  const scrolls = loopWidth > 0;
  const duration = loopWidth / PIXELS_PER_SECOND;
  const content = (
    <>
      {text}
      {trailing && (
        <Box as="span" sx={{ ml: 2, opacity: 0.7, fontVariantNumeric: "tabular-nums" }}>
          {trailing}
        </Box>
      )}
    </>
  );

  return (
    <Box ref={boxRef} title={text} sx={{ overflow: "hidden", whiteSpace: "nowrap", ...sx }}>
      <Box
        sx={{
          display: "inline-flex",
          gap: `${GAP}px`,
          "--marquee-distance": `-${loopWidth}px`,
          animation: scrolls ? `music-marquee ${duration}s linear infinite` : "none",
          animationPlayState: running ? "running" : "paused",
          "@keyframes music-marquee": {
            from: { transform: "translateX(0)" },
            to: { transform: "translateX(var(--marquee-distance))" },
          },
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        }}
      >
        <span ref={textRef}>{content}</span>
        {scrolls && <span aria-hidden>{content}</span>}
      </Box>
    </Box>
  );
};

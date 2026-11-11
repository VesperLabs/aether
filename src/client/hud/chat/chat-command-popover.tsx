import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Box, Flex, KeyboardKey, Text } from "@/ui";
import { isMobile } from "@/ui";
import type { ChatSuggestion } from "./chat-command-match";
import { ChatActorPreview } from "./chat-actor-preview";
import { ChatItemPreview } from "./chat-item-preview";
import { SeasonIconImage } from "@/client/hud/sky-disc/season-icon-image";
import { PAD_POPUP_ATTR } from "@/client/input/pad-keyboard-events";

const HIGHLIGHT = "rgba(255,255,255,.12)";
/** The gap between the list and the chat box under it. */
const GAP_PX = 8;
/** Room kept between the list's top and the top of what's visible. */
const TOP_MARGIN_PX = 12;
/** Never squash the list below about three rows, even if it has to run under the top. */
const MIN_HEIGHT_PX = 120;

/**
 * The height the list can fill above the chat box. A phone's keyboard shrinks what's visible
 * (the visual viewport) without always resizing the page, so `vh` can't tell; this measures the
 * gap between the box and the visible top, and again whenever the keyboard opens or closes.
 */
function useRoomAbove(list: RefObject<HTMLElement | null>) {
  const [room, setRoom] = useState<number>();
  useLayoutEffect(() => {
    const viewport = window.visualViewport;
    const measure = () => {
      const anchor = list.current?.parentElement;
      if (!anchor) return;
      const visibleTop = viewport?.offsetTop ?? 0;
      const free = anchor.getBoundingClientRect().top - visibleTop - TOP_MARGIN_PX - GAP_PX;
      setRoom(Math.max(MIN_HEIGHT_PX, Math.floor(free)));
    };
    measure();
    viewport?.addEventListener("resize", measure);
    viewport?.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);
    return () => {
      viewport?.removeEventListener("resize", measure);
      viewport?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [list]);
  return room;
}

/** One way to type a command, as a little keycap next to its name. */
const AliasChip = ({ alias }: { alias: string }) => (
  <Text
    sx={{
      p: "4px",
      borderRadius: 3,
      bg: "rgba(0,0,0,.12)",
      opacity: 0.7,
      color: "gray.100",
      fontSize: 0,
      lineHeight: 1,
      whiteSpace: "nowrap",
    }}
  >
    {alias}
  </Text>
);

/**
 * Wooden list of `/command` suggestions above the chat input. Rows share one grid so names
 * and hints line up in columns. Up/Down move the highlight; Tab, Right or Enter puts it in the box.
 * The rows scroll when there are many. Commands show their shortcuts as chips.
 */
export const ChatCommandPopover = ({
  suggestions,
  highlighted,
  onPick,
}: {
  suggestions: readonly ChatSuggestion[];
  highlighted: number;
  onPick: (suggestion: ChatSuggestion) => void;
}) => {
  const hasPreviews = suggestions.some((s) => s.look || s.icon);
  const highlightedRow = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const roomAbove = useRoomAbove(list);
  /* By what's listed, not the list itself, which is new each render: scrolling back on every
   * render would undo a controller scrolling the list */
  const listed = suggestions.map((s) => s.value).join("\n");
  useEffect(() => {
    highlightedRow.current?.scrollIntoView({ block: "nearest" });
  }, [highlighted, listed]);
  return (
    <Box
      ref={list}
      /* On a controller it takes over from the on-screen keyboard (`PAD_POPUP_ATTR`) */
      {...{ [PAD_POPUP_ATTR]: true }}
      variant="buttons.wood"
      sx={{
        position: "absolute",
        bottom: `calc(100% + ${GAP_PX}px)`,
        left: 0,
        minWidth: 260,
        maxWidth: "calc(100vw - 24px)",
        display: "grid",
        /* [item icon] | name | hint | key badge */
        gridTemplateColumns: `${hasPreviews ? "32px " : ""}max-content 1fr ${isMobile ? 0 : "36px"}`,
        rowGap: "2px",
        maxHeight: isMobile ? (roomAbove ?? "40vh") : 360,
        overflowY: "auto",
        /* It sits in the chat button, whose `touch-action: none` would stop a finger scrolling it */
        touchAction: "pan-y",
        overscrollBehavior: "contain",
        p: 1,
        cursor: "default",
        pointerEvents: "all",
      }}
    >
      {suggestions.map((suggestion, idx) => {
        const isHighlighted = idx === highlighted;
        return (
          <Box
            key={suggestion.value}
            /* A stop for the controller's highlight; A picks it */
            role="option"
            ref={isHighlighted ? highlightedRow : undefined}
            /* Keep focus in the input so mobile doesn't blur-send the draft */
            onPointerDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              onPick(suggestion);
            }}
            sx={{
              gridColumn: "1 / -1",
              display: "grid",
              gridTemplateColumns: "subgrid",
              alignItems: "center",
              columnGap: 3,
              px: 2,
              py: isMobile ? 2 : 1,
              borderRadius: 3,
              cursor: "pointer",
              bg: isHighlighted ? HIGHLIGHT : "transparent",
              "&:hover": { bg: HIGHLIGHT },
            }}
          >
            {hasPreviews &&
              (suggestion.actor ? (
                <ChatActorPreview actorId={suggestion.actor} />
              ) : suggestion.look ? (
                <ChatItemPreview look={suggestion.look} />
              ) : suggestion.icon ? (
                <SeasonIconImage icon={suggestion.icon} size={24} />
              ) : (
                <Box />
              ))}
            <Flex sx={{ alignItems: "center", gap: 1 }}>
              <Text
                sx={{
                  fontWeight: "bold",
                  color: suggestion.rarity ?? "white",
                  fontSize: 2,
                  lineHeight: 1,
                  textAlign: "left",
                }}
              >
                {suggestion.label ?? suggestion.value}
              </Text>
              {suggestion.aliases?.map((alias) => (
                <AliasChip key={alias} alias={alias} />
              ))}
            </Flex>
            <Text
              sx={{
                color: "gray.100",
                opacity: 0.6,
                fontSize: 1,
                lineHeight: isMobile ? 1.2 : 1,
                textAlign: "left",
                /* No room for a third column on a phone, so the hint drops under the name */
                ...(isMobile && suggestion.aliases && { gridColumn: "1 / -1", mt: 1 }),
              }}
            >
              {suggestion.hint}
            </Text>
            <Box sx={{ position: "relative", height: 16 }}>
              {isHighlighted && !isMobile && (
                <KeyboardKey name="TAB" showOnly sx={{ top: 0, bottom: "auto", right: 0 }} />
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

import { useEffect, useRef } from "react";
import { Box, KeyboardKey, Text } from "@/ui";
import { isMobile } from "@/ui";
import type { ChatSuggestion } from "./chat-command-match";
import { ChatItemPreview } from "./chat-item-preview";

const HIGHLIGHT = "rgba(255,255,255,.12)";

/**
 * Wooden list of `/command` suggestions above the chat input. Rows share one grid so names
 * and hints line up in columns. Up/Down move the highlight; Tab, Right or Enter puts it in the box.
 * The rows scroll when there are many.
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
  const hasPreviews = suggestions.some((s) => s.look);
  const highlightedRow = useRef<HTMLDivElement>(null);
  useEffect(() => {
    highlightedRow.current?.scrollIntoView({ block: "nearest" });
  }, [highlighted, suggestions]);
  return (
    <Box
      variant="buttons.wood"
      sx={{
        position: "absolute",
        bottom: "calc(100% + 8px)",
        left: 0,
        minWidth: 260,
        display: "grid",
        /* [item icon] | name | hint | key badge */
        gridTemplateColumns: `${hasPreviews ? "32px " : ""}max-content 1fr ${isMobile ? 0 : "36px"}`,
        rowGap: "2px",
        maxHeight: isMobile ? "40vh" : 360,
        overflowY: "auto",
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
              (suggestion.look ? <ChatItemPreview look={suggestion.look} /> : <Box />)}
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
            <Text
              sx={{
                color: "gray.100",
                opacity: 0.6,
                fontSize: 1,
                lineHeight: 1,
                textAlign: "left",
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

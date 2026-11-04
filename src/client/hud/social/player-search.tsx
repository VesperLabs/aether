import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { HudCharacter } from "@/client/hud/app/context";
import { useAppContext } from "@/client/hud/app/context";
import { Box, Flex, Icon, Input, KeyboardKey, Text, isMobile } from "@/ui";
import { ELLIPSIS_STYLE, classIconOf, detailsOf, getPlayerAction } from "./player-row";

const HIGHLIGHT = "rgba(255,255,255,.12)";

/**
 * A search box for players to invite. Typing opens a wooden list under it, styled like the chat's
 * `/` popover: Up/Down move the highlight, Enter invites (or accepts) the highlighted player.
 */
export const PlayerSearch = ({ players }: { players: HudCharacter[] }) => {
  const context = useAppContext();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const highlightedRow = useRef<HTMLDivElement>(null);

  const needle = query.trim().toLowerCase();
  const matches = players.filter((p) => p?.profile?.userName?.toLowerCase().includes(needle));
  const isOpen = isFocused && (needle.length > 0 || matches.length > 0);
  const current = Math.min(highlighted, matches.length - 1);

  useEffect(() => {
    highlightedRow.current?.scrollIntoView({ block: "nearest" });
  }, [current, needle]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") setHighlighted(Math.min(current + 1, matches.length - 1));
    else if (e.key === "ArrowUp") setHighlighted(Math.max(current - 1, 0));
    else if (e.key === "Enter") getPlayerAction(matches[current], context).run?.();
    else return;
    e.preventDefault();
  };

  return (
    <Box sx={{ position: "relative" }}>
      <Input
        value={query}
        placeholder="Search players to invite"
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlighted(0);
          setIsFocused(true);
        }}
        onKeyDown={onKeyDown}
        onKeyUp={(e) => {
          /* Esc closes the list first; the modal only sees it once the list is shut */
          if (e.key !== "Escape" || !isOpen) return;
          e.stopPropagation();
          setIsFocused(false);
        }}
        onFocus={() => setIsFocused(true)}
        onClick={() => setIsFocused(true)}
        onClickOutside={() => setIsFocused(false)}
        sx={{ width: "100%", py: 2 }}
      />
      {isOpen && (
        <Box
          variant="buttons.wood"
          sx={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            maxHeight: isMobile ? "40vh" : 280,
            overflowY: "auto",
            p: 1,
            cursor: "default",
          }}
        >
          {matches.length === 0 && (
            <Text sx={{ px: 2, py: 2, opacity: 0.6 }}>No players match "{query.trim()}"</Text>
          )}
          {matches.map((player, idx) => (
            <SearchRow
              key={player.id}
              player={player}
              isHighlighted={idx === current}
              rowRef={idx === current ? highlightedRow : undefined}
              onHover={() => setHighlighted(idx)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

const SearchRow = ({
  player,
  isHighlighted,
  rowRef,
  onHover,
}: {
  player: HudCharacter;
  isHighlighted: boolean;
  rowRef?: React.Ref<HTMLDivElement>;
  onHover: () => void;
}) => {
  const { label, run } = getPlayerAction(player, useAppContext());
  const classIcon = classIconOf(player);
  return (
    <Flex
      ref={rowRef}
      /* Keep focus in the input so the list stays open */
      onPointerDown={(e) => e.preventDefault()}
      onPointerEnter={onHover}
      onClick={run}
      sx={{
        alignItems: "center",
        gap: 2,
        px: 2,
        py: isMobile ? 2 : 1,
        borderRadius: 3,
        cursor: run ? "pointer" : "default",
        bg: isHighlighted ? HIGHLIGHT : "transparent",
      }}
    >
      {classIcon && <Icon icon={classIcon} size={24} sx={{ flexShrink: 0 }} />}
      <Text sx={{ ...ELLIPSIS_STYLE, fontWeight: "bold", fontSize: 2, lineHeight: 1 }}>
        {player.profile?.userName}
      </Text>
      <Text
        sx={{
          ...ELLIPSIS_STYLE,
          flex: 1,
          minWidth: 0,
          fontSize: 1,
          lineHeight: 1,
          opacity: 0.6,
          textTransform: "capitalize",
        }}
      >
        {detailsOf(player)}
      </Text>
      {/* Fixed width, and the key badge keeps its slot on every row, so nothing shifts as the
       * highlight moves */}
      <Text
        sx={{
          width: 52,
          flexShrink: 0,
          textAlign: "right",
          fontSize: 1,
          opacity: run ? 1 : 0.5,
          color: run ? "set" : "text",
        }}
      >
        {label}
      </Text>
      {!isMobile && (
        <Box sx={{ position: "relative", width: 36, height: 16, flexShrink: 0 }}>
          {isHighlighted && run && (
            <KeyboardKey name="ENTER" showOnly sx={{ top: 0, bottom: "auto", right: 0 }} />
          )}
        </Box>
      )}
    </Flex>
  );
};

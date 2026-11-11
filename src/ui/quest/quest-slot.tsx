import type { Quest } from "@/content";
import type { PlayerQuestStatus } from "@/rules/quests";
import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { BASE_SLOT_STYLE, ItemSlot, SLOT_SIZE } from "@/ui/item";
import { Box, Flex, Icon, Tooltip, isMobile } from "@/ui/kit";
import { QuestDetails } from "./quest-details";
import { questIcon } from "./quest-text";

/** A bare quest icon's size: the art's own, like a shop item's sprite beside it. */
const BARE_SIZE = 32;

/** How long the tooltip waits after the pointer leaves, so it can cross to the tooltip. */
const HIDE_DELAY = 200;

/** The badge on a quest the player has: done, ready to turn in, or under way. */
const statusEmoji = (playerQuest?: PlayerQuestStatus) => {
  if (playerQuest?.isCompleted) return "🏆";
  if (playerQuest?.isReady) return "✅";
  if (playerQuest) return "⏰";
};

/**
 * A quest in a slot, as the game's quest menus and the wiki show it: its kind's icon, and its
 * tooltip while hovered (tapped on a phone). The caller owns `show`, so a menu can keep one
 * tooltip open at a time. `children` go under the details, for the game's buttons.
 */
export const QuestSlot = ({
  quest,
  playerQuest,
  player,
  show,
  onShow,
  onHide,
  slotProps,
  tooltipProps,
  bare,
  children,
}: {
  quest: Quest;
  playerQuest?: PlayerQuestStatus;
  player?: ComponentProps<typeof ItemSlot>["player"];
  show: boolean;
  onShow: () => void;
  onHide: () => void;
  /** Extra attributes for the slot, such as the game's controller stop. */
  slotProps?: Record<string, unknown>;
  /** Extra attributes for the tooltip's content, such as the game's controller popover. */
  tooltipProps?: Record<string, unknown>;
  /** Just the icon at 32px, without the slot, as the wiki lists a keeper's quests. */
  bare?: boolean;
  children?: ReactNode;
}) => {
  const size = bare ? BARE_SIZE : SLOT_SIZE;
  const tooltipId = useId();
  /*
   * The tooltip sits a gap away from the slot. Crossing it leaves the slot, so hiding waits a
   * moment; reaching the tooltip (a child of the slot to React) counts as entering again and
   * keeps it open, so the pointer can move on to the rewards and hover them.
   */
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(hideTimer.current), []);
  const enter = () => {
    clearTimeout(hideTimer.current);
    onShow();
  };
  const leave = () => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(onHide, HIDE_DELAY);
  };
  /*
   * The tooltip holds itself open too, through its own element: if hiding went ahead while the
   * pointer crossed over, it would close and reopen under the pointer, and the reward slot it
   * landed on would miss its hover until it moved off and back.
   */
  /* Set when its content mounts, and cleared when it closes. */
  const [tooltipEl, setTooltipEl] = useState<HTMLElement | null>(null);
  const hover = useEffectEvent((inside: boolean) => (inside ? enter() : leave()));
  useEffect(() => {
    const el = tooltipEl;
    if (!el || isMobile) return;
    const onEnter = () => hover(true);
    const onLeave = () => hover(false);
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [tooltipEl]);
  const hoverBinds = isMobile
    ? { onTouchEnd: onShow }
    : { onMouseEnter: enter, onMouseLeave: leave };
  return (
    <Box
      sx={bare ? { width: size, height: size, cursor: "help" } : BASE_SLOT_STYLE}
      {...hoverBinds}
      onTouchStart={onShow}
      /* A click on it (after its tooltip's Close) opens the tooltip again */
      onClick={onShow}
      {...slotProps}
    >
      <Box
        data-tooltip-id={tooltipId}
        sx={{
          position: "relative",
          overflow: show ? "visible" : "hidden",
          width: size,
          height: size,
          filter: playerQuest?.isCompleted ? "grayscale(100%)" : "none",
        }}
      >
        <Icon
          icon={questIcon(quest)}
          /* In a slot the art is drawn at twice its size, as the game's quest log does */
          sx={{
            width: "100%",
            height: "100%",
            transform: bare ? "none" : "scale(2)",
            /* Scaled past its slot while the tooltip is open: never take a neighbour's hover */
            pointerEvents: "none",
          }}
        />
        {/* Top-right: the controller's A badge sits on the bottom-right corner */}
        <Box sx={{ position: "absolute", top: 1, right: 1 }}>{statusEmoji(playerQuest)}</Box>
      </Box>
      <Tooltip id={tooltipId} style={{ pointerEvents: "all" }} isOpen={show}>
        <Flex
          ref={setTooltipEl}
          {...tooltipProps}
          sx={{ flexDirection: "column", alignItems: "center" }}
        >
          <QuestDetails quest={quest} playerQuest={playerQuest} player={player} />
          {children}
        </Flex>
      </Tooltip>
    </Box>
  );
};

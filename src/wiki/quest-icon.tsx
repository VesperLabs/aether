import { PREVIEW_DICE, QuestBuilder, type QuestId } from "@/content";
import type { PlayerQuestStatus } from "@/rules/quests";
import { QuestSlot } from "@/ui";
import { useId, useMemo, useSyncExternalStore } from "react";

/* Which quest icon's tooltip is open, across the whole wiki: one at a time, as in the game. */
let openIcon: string | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const setOpenIcon = (next: string | null) => {
  openIcon = next;
  for (const listener of listeners) listener();
};

/** A quest on the wiki: the game's own quest slot, with a player's progress if they have it. */
export const QuestIcon = ({
  id,
  playerQuest,
  bare,
}: {
  id: QuestId;
  playerQuest?: PlayerQuestStatus;
  /** Just the icon, without the slot. */
  bare?: boolean;
}) => {
  const iconId = useId();
  const open = useSyncExternalStore(subscribe, () => openIcon === iconId);
  /* Built as the game builds it, so the rewards show their gold, exp and items. */
  const quest = useMemo(() => QuestBuilder.buildQuest(PREVIEW_DICE, id), [id]);
  return (
    <QuestSlot
      quest={quest}
      playerQuest={playerQuest}
      bare={bare}
      show={open}
      onShow={() => setOpenIcon(iconId)}
      /* Only its own: a late hide mustn't close the quest the pointer has moved on to. */
      onHide={() => openIcon === iconId && setOpenIcon(null)}
    />
  );
};

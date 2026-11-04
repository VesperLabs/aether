import type { ReactNode } from "react";
import type { HudCharacter } from "@/client/hud/app/context";
import { useAppContext } from "@/client/hud/app/context";
import { Portrait } from "@/client/hud/status/portrait";
import type { ThemeUIStyleObject } from "theme-ui";
import { Flex, Text, Icon, Button, Box } from "@/ui";
import { CLASS_ICON_MAP } from "@/content";

export type SocialPlayer = Partial<HudCharacter> | undefined;

type AppContext = ReturnType<typeof useAppContext>;

export interface PlayerAction {
  label: "Invite" | "Pending" | "Accept";
  run?: () => void;
}

/** What you can do with another player: accept their invite, wait on yours, or invite them. */
export const getPlayerAction = (
  player: SocialPlayer,
  {
    partyInvites,
    party,
    hero,
    socket,
  }: Pick<AppContext, "partyInvites" | "party" | "hero" | "socket">,
): PlayerAction => {
  const invitation = partyInvites?.find((invite) => invite?.inviter?.id === player?.id);
  if (invitation) {
    return { label: "Accept", run: () => socket.emit("partyAccept", invitation.partyId) };
  }
  const isPending = party?.invitees?.some(
    (invitee: { id?: string; inviterId?: string }) =>
      invitee?.id === player?.id && invitee?.inviterId === hero?.id,
  );
  if (isPending) return { label: "Pending" };
  return {
    label: "Invite",
    run: () => player?.socketId && socket.emit("inviteToParty", player.socketId),
  };
};

/** Action buttons share one width, so Invite, Pending, Accept and Leave line up. */
const ACTION_BUTTON_STYLE: ThemeUIStyleObject = { width: 80, justifyContent: "center" };

export const ELLIPSIS_STYLE: ThemeUIStyleObject = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

export const ActionButton = ({ player }: { player: SocialPlayer }) => {
  const context = useAppContext();
  const { label, run } = getPlayerAction(player, context);
  return (
    <Button variant="wood" sx={ACTION_BUTTON_STYLE} disabled={!run} onClick={run}>
      {label}
    </Button>
  );
};

export const LeaveButton = ({ player }: { player: SocialPlayer }) => {
  const { hero, socket } = useAppContext();
  if (hero?.id !== player?.id) return null;
  return (
    <Button
      variant="wood"
      sx={ACTION_BUTTON_STYLE}
      onClick={() => socket.emit("partyLeave", player?.id)}
    >
      Leave
    </Button>
  );
};

export const classIconOf = (player: SocialPlayer) =>
  player?.charClass
    ? CLASS_ICON_MAP?.[player.charClass.toUpperCase() as keyof typeof CLASS_ICON_MAP]
    : undefined;

export const detailsOf = (player: SocialPlayer, roomName = player?.roomName) =>
  [player?.stats && `Lv. ${player.stats.level}`, roomName].filter(Boolean).join(" · ");

/** One player per row: portrait, name over level, class and room, then the action. */
export const PlayerRow = ({
  partyPlayer,
  children,
}: {
  partyPlayer: SocialPlayer;
  children: ReactNode;
}) => {
  const { party, players } = useAppContext();
  const player = players?.find((p) => p?.id === partyPlayer?.id);
  const isLeader =
    party?.members?.find((p: { isLeader?: boolean }) => p?.isLeader)?.id === partyPlayer?.id;
  const classIcon = classIconOf(player);
  return (
    <Flex sx={{ alignItems: "center", gap: 2, bg: "shadow.20", borderRadius: 4, p: 1, pr: 2 }}>
      <Box sx={{ position: "relative", width: 28, flexShrink: 0 }}>
        <Portrait
          player={player}
          scale={0.5}
          size={25}
          topOffset={13}
          filteredSlots={["boots", "pants", "hands", "gloves"]}
        />
        {isLeader && (
          <Icon
            icon="./assets/icons/crown.png"
            sx={{ position: "absolute", left: "-2px", top: "-11px" }}
          />
        )}
      </Box>
      {classIcon && <Icon icon={classIcon} size={24} sx={{ flexShrink: 0 }} />}
      <Flex sx={{ flexDirection: "column", flex: 1, minWidth: 0 }}>
        <Text sx={ELLIPSIS_STYLE}>
          {player?.profile?.userName ?? partyPlayer?.profile?.userName}
        </Text>
        <Text sx={{ ...ELLIPSIS_STYLE, textTransform: "capitalize", fontSize: 0, opacity: 0.8 }}>
          {detailsOf(player, partyPlayer?.roomName)}
        </Text>
      </Flex>
      {children}
    </Flex>
  );
};

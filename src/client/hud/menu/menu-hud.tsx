import { memo, useEffect, useRef, useState } from "react";
import { Box, Flex, Text } from "@/ui";
import { useAppContext } from "@/client/hud/app/context";
import { Portrait } from "@/client/hud/status/portrait";
import { StatusIcon } from "@/client/hud/status/status-icon";
import { arePropsEqualWithKeys } from "@/ui/are-props-equal";
import { streamHasUsableVideo } from "@/client/hud/video/video-support";
import { Bar } from "@/client/hud/status/stat-bar";
import { Buffs } from "@/client/hud/status/buffs";
import { Tooltip } from "@/client/hud/tooltips/tooltip";

const UserName = ({ sx, player }: { player: any; sx?: object }) => {
  return <Box sx={{ ...sx }}>{player?.profile?.userName}</Box>;
};

const PlayerHud = memo(
  ({ player, isBig, portraitVideoStream, isNearby = false }: any) => {
    const { stats, profile, equipment, activeItemSlots } = player ?? {};
    const isOffScreen = !player;
    const videoStream = portraitVideoStream ?? null;
    const memoProps = {
      activeItemSlots,
      equipment,
      profile,
      level: player?.stats?.level,
      useVideoPortrait: !!videoStream,
    };

    return (
      <Flex
        sx={{
          gap: 1,
          position: "relative",
          filter: isOffScreen ? "grayscale(100%)" : "none",
        }}
      >
        <Memoized
          as={Portrait}
          player={player}
          videoStream={videoStream}
          muteVideo={isNearby ? false : isBig}
          filteredSlots={["boots", "pants"]}
          size={isBig ? 54 : 32}
          scale={isBig ? 1 : 0.57}
          topOffset={isBig ? 22 : 12}
          memoProps={memoProps}
        />
        <Flex sx={{ flexDirection: "column", gap: "1px", pointerEvents: "all" }}>
          <Memoized
            as={UserName}
            sx={{ fontSize: isBig ? 2 : 0 }}
            player={player}
            memoProps={memoProps}
          />
          <Bar
            data-tooltip-content={`HP: ${stats?.hp} / ${stats?.maxHp}`}
            color="red.700"
            max={stats?.maxHp}
            min={stats?.hp}
            showText={isBig}
            width={isBig ? 100 : 50}
            height={isBig ? 12 : 6}
          />
          {!isNearby && (
            <>
              <Bar
                data-tooltip-content={`MP: ${stats?.mp} / ${stats?.maxMp}`}
                color="blue.500"
                max={stats?.maxMp}
                min={stats?.mp}
                showText={isBig}
                width={isBig ? 100 : 50}
                height={isBig ? 12 : 6}
              />
              <Bar
                data-tooltip-content={`SP: ${stats?.sp} / ${stats?.maxSp}`}
                color="green.500"
                max={stats?.maxSp}
                min={stats?.sp}
                width={isBig ? 100 : 50}
                height={6}
                showText={false}
              />
            </>
          )}
          {isBig && (
            <Bar
              data-tooltip-content={`EXP: ${stats?.exp} / ${stats?.maxExp}`}
              color="purple.400"
              max={stats?.maxExp}
              min={stats?.exp}
              height={6}
              showText={false}
            />
          )}
          <Buffs player={player} sx={!isBig ? { transform: `scale(0.6)` } : {}} />
        </Flex>
        <Memoized
          as={LevelIcon}
          player={player}
          sx={!isBig ? { transform: `scale(0.6)` } : {}}
          memoProps={memoProps}
        />
      </Flex>
    );
  },
  arePropsEqualWithKeys([
    "player.stats",
    "player.profile",
    "player.equipment",
    "player.activeItemSlots",
    "player.buffs",
    "portraitVideoStream",
    "isNearby",
  ]),
);

const LevelIcon = ({ player, sx }) => {
  return (
    <Box
      data-tooltip-place="bottom"
      data-tooltip-id="hud"
      data-tooltip-content={`Level ${player?.stats?.level} ${player?.charClass} `}
      sx={{
        textTransform: "capitalize",
        borderRadius: 6,
        minWidth: 20,
        textAlign: "center",
        lineHeight: "16px",
        fontSize: 0,
        pointerEvents: "all",
        position: "absolute",
        background: "black",
        border: `1px solid white`,
        boxShadow: `0px 0px 0px 1px black`,
        transformOrigin: "top left",
        ...sx,
      }}
    >
      {player?.stats?.level}
    </Box>
  );
};

/** Fade-out duration for proximity plates; WebRTC teardown is delayed to match (see VideoFrame). */
const NEARBY_EXIT_MS = 380;

function remotePortraitStream(
  videoChatOn: boolean,
  remoteVideoStreams: Record<string, MediaStream>,
  player: FullCharacterState | null | undefined,
): MediaStream | null {
  if (!videoChatOn || !player?.peerId) return null;
  const s = remoteVideoStreams[player.peerId];
  return s && streamHasUsableVideo(s) ? s : null;
}

export const MenuHud = () => {
  const {
    hero,
    party,
    players,
    zoom,
    userSettings,
    localVideoChatStream,
    remoteVideoStreams,
    isConnected,
  } = useAppContext();
  const [nearbySocketIds, setNearbySocketIds] = useState<string[]>([]);
  const [exitingNearbyIds, setExitingNearbyIds] = useState<Set<string>>(() => new Set());
  const nearbyExitTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const partyIds = party?.members?.map((p) => p?.id)?.filter((id) => hero?.id !== id);
  const hasParty = partyIds?.length > 0;
  const videoChatOn = !!userSettings?.videoChat;

  const heroPortraitVideo =
    videoChatOn && streamHasUsableVideo(localVideoChatStream) ? localVideoChatStream : null;

  useEffect(() => {
    if (!isConnected) {
      nearbyExitTimersRef.current.forEach((t) => clearTimeout(t));
      nearbyExitTimersRef.current.clear();
      setNearbySocketIds([]);
      setExitingNearbyIds(new Set());
    }
  }, [isConnected]);

  useEffect(() => {
    const onNear = (e: Event) => {
      const socketId = (e as CustomEvent<{ socketId?: string }>)?.detail?.socketId;
      if (!socketId) return;
      const pending = nearbyExitTimersRef.current.get(socketId);
      if (pending) {
        clearTimeout(pending);
        nearbyExitTimersRef.current.delete(socketId);
      }
      setExitingNearbyIds((prev) => {
        if (!prev.has(socketId)) return prev;
        const next = new Set(prev);
        next.delete(socketId);
        return next;
      });
      setNearbySocketIds((prev) => (prev.includes(socketId) ? prev : [...prev, socketId]));
    };
    const onAway = (e: Event) => {
      const socketId = (e as CustomEvent<{ socketId?: string }>)?.detail?.socketId;
      if (!socketId) return;
      const pending = nearbyExitTimersRef.current.get(socketId);
      if (pending) clearTimeout(pending);
      setExitingNearbyIds((prev) => new Set(prev).add(socketId));
      const t = setTimeout(() => {
        nearbyExitTimersRef.current.delete(socketId);
        setNearbySocketIds((prev) => prev.filter((id) => id !== socketId));
        setExitingNearbyIds((prev) => {
          const next = new Set(prev);
          next.delete(socketId);
          return next;
        });
      }, NEARBY_EXIT_MS);
      nearbyExitTimersRef.current.set(socketId, t);
    };
    window.addEventListener("HERO_NEAR_PLAYER", onNear);
    window.addEventListener("HERO_AWAY_PLAYER", onAway);
    return () => {
      window.removeEventListener("HERO_NEAR_PLAYER", onNear);
      window.removeEventListener("HERO_AWAY_PLAYER", onAway);
    };
  }, []);

  const partyIdSet = new Set((partyIds ?? []).map(String));
  const nearbyNonPartyIds = nearbySocketIds.filter((sid) => {
    if (!sid || partyIdSet.has(String(sid)) || String(sid) === String(hero?.id)) return false;
    return !!players?.some(
      (pl) => String(pl?.socketId) === String(sid) || String(pl?.id) === String(sid),
    );
  });

  return (
    <Box
      sx={{
        top: 2,
        left: 2,
        position: "absolute",
        transform: `scale(${(1.25 * parseFloat(zoom)).toFixed(1)})`,
        transformOrigin: "top left",
      }}
    >
      <Tooltip id="hud" />
      <PlayerHud
        player={structuredClone(hero)}
        isBig={true}
        portraitVideoStream={heroPortraitVideo}
      />
      <StatusIcon />
      <Flex sx={{ flexDirection: "row", alignItems: "flex-start", gap: 3 }}>
        <Flex sx={{ flexDirection: "column" }}>
          {hasParty &&
            partyIds?.map((id) => {
              const p = players?.find((pl) => pl?.id === id);
              return (
                <PlayerHud
                  isBig={false}
                  player={structuredClone(p)}
                  key={id}
                  portraitVideoStream={remotePortraitStream(videoChatOn, remoteVideoStreams, p)}
                />
              );
            })}
        </Flex>
        {nearbyNonPartyIds.length > 0 && (
          <Flex sx={{ flexDirection: "column", gap: "2px" }}>
            {nearbyNonPartyIds.map((socketId) => {
              const p = players?.find(
                (pl) =>
                  String(pl?.socketId) === String(socketId) || String(pl?.id) === String(socketId),
              );
              if (!p) return null;
              const isExiting = exitingNearbyIds.has(socketId);
              return (
                <Flex
                  key={`nearby-${socketId}`}
                  sx={{
                    opacity: isExiting ? 0 : 1,
                    transition: "opacity 0.35s ease-out",
                    pointerEvents: isExiting ? "none" : "auto",
                  }}
                >
                  <PlayerHud
                    isBig={false}
                    isNearby={true}
                    player={structuredClone(p)}
                    portraitVideoStream={remotePortraitStream(videoChatOn, remoteVideoStreams, p)}
                  />
                </Flex>
              );
            })}
          </Flex>
        )}
      </Flex>
    </Box>
  );
};

const Memoized = memo(
  (props: any) => {
    const { as: As = Text } = props;
    return <As {...props}></As>;
  },
  (prev, next) => {
    if (prev?.player && !next?.player) return true;
    if (JSON.stringify(prev?.memoProps) === JSON.stringify(next?.memoProps)) return true;
    return false;
  },
);

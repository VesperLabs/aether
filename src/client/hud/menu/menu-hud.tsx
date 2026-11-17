import { memo, useEffect, useRef, useState, type ElementType } from "react";
import type { ThemeUIStyleObject } from "theme-ui";
import { Box, Flex, Grid, Text } from "@/ui";
import { useAppContext, type HudCharacter } from "@/client/hud/app/context";
import { Portrait } from "@/client/hud/status/portrait";
import { arePropsEqualWithKeys } from "@/ui";
import { streamHasUsableVideo } from "@/client/hud/video/video-support";
import { Bar } from "@/client/hud/status/stat-bar";
import { Buffs } from "@/client/hud/status/buffs";
import { PIES_OVERHANG, StatPies, statPie } from "@/client/hud/status/stat-pies";
import { Tooltip, resourceToken } from "@/ui";
import { useNpcPlates } from "./use-npc-plates";
import { LevelIcon } from "./level-icon";

/**
 * A small plate's level badge is drawn small, not shrunk, so its lines stay as fine as the big
 * plate's. Its buffs are the big plate's size.
 */
const MINI_LEVEL = { minWidth: 14, lineHeight: "11px", fontSize: "8px", borderRadius: 4 };

/** Small plates, two to a row from the screen's edge. */
/** Between a plate's portrait and its name and bars, in px. */
const PORTRAIT_GAP = 0;
/**
 * Small plates, two to a row in even halves of your plate's width: its 56px portrait, the gap and
 * its 100px bars. Fixed, not taken from your plate, whose buff row grows it, so plates never shift
 * as names and buffs change.
 */
const PLATE_GRID = {
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "2px 8px",
  mt: 1,
  width: 56 + PORTRAIT_GAP + 100,
};
/** Every plate's name, as the player typed it. */
const NAME = { lineHeight: 1.2 };
/** A small plate's name fades out at its column's edge, rather than widening it. */
const FADING_NAME = {
  overflow: "hidden",
  whiteSpace: "nowrap",
  maskImage: "linear-gradient(to right, #000 calc(100% - 10px), transparent)",
};
/** A small plate's portrait, in px. */
const MINI_PORTRAIT = 28;
/** Rows of buffs a small plate shows before cutting the rest off. */
const MINI_BUFF_ROWS = 2;

const UserName = ({
  sx,
  player,
}: {
  player?: Partial<HudCharacter> | null;
  sx?: ThemeUIStyleObject;
}) => {
  return <Box sx={{ ...sx }}>{player?.profile?.userName}</Box>;
};

const PlayerHud = memo(
  ({
    player,
    isBig,
    portraitVideoStream,
    isNearby = false,
  }: {
    player?: Partial<HudCharacter> | null;
    isBig: boolean;
    portraitVideoStream?: MediaStream | null;
    isNearby?: boolean;
  }) => {
    const { stats, profile, equipment, activeItemSlots } = player ?? {};
    const isOffScreen = !player;
    const videoStream = portraitVideoStream ?? null;
    /* A small plate's stats, as pies on its ring: HP, and a party member's MP and SP */
    const pies = [
      statPie.hp(stats?.hp, stats?.maxHp),
      ...(!isNearby && player?.kind === "player"
        ? [statPie.mp(stats?.mp, stats?.maxMp), statPie.sp(stats?.sp, stats?.maxSp)]
        : []),
    ];
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
          /* The name and bars almost touch the portrait */
          gap: `${PORTRAIT_GAP}px`,
          position: "relative",
          filter: isOffScreen ? "grayscale(100%)" : "none",
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            position: "relative",
            alignSelf: "flex-start",
            /* Room for the pies hanging below the ring */
            mb: isBig ? 0 : `${PIES_OVERHANG}px`,
          }}
        >
          <Memoized
            as={Portrait}
            player={player}
            videoStream={videoStream}
            muteVideo={isNearby ? false : isBig}
            filteredSlots={["boots", "pants"]}
            size={isBig ? 54 : MINI_PORTRAIT}
            /* The render is drawn at 2x: half that lands a small portrait on whole pixels (1x), crisp */
            scale={isBig ? 1 : 0.5}
            topOffset={isBig ? 22 : 10}
            memoProps={memoProps}
          />
          {/* The ring is the portrait and its 1px border each side */}
          {!isBig && <StatPies ringSize={MINI_PORTRAIT + 2} pies={pies} />}
        </Box>
        <Flex
          sx={{ flexDirection: "column", gap: "1px", pointerEvents: "all", minWidth: 0, flex: 1 }}
        >
          <Memoized
            as={UserName}
            sx={{ ...NAME, ...(isBig ? { fontSize: 1 } : { fontSize: "9px", ...FADING_NAME }) }}
            player={player}
            memoProps={memoProps}
          />
          {isBig && (
            <Bar
              data-tooltip-content={`HP: ${stats?.hp} / ${stats?.maxHp}`}
              color="red.700"
              max={stats?.maxHp}
              min={stats?.hp}
              showText
              width={100}
              height={12}
            />
          )}
          {/* NPCs never spend mana or stamina, so theirs would only sit full */}
          {isBig && player?.kind === "player" && (
            <>
              <Bar
                data-tooltip-content={`MP: ${stats?.mp} / ${stats?.maxMp}`}
                color={resourceToken("mp")}
                max={stats?.maxMp}
                min={stats?.mp}
                showText={isBig}
                width={isBig ? 100 : 50}
                height={isBig ? 12 : 6}
              />
              <Bar
                data-tooltip-content={`SP: ${stats?.sp} / ${stats?.maxSp}`}
                color={resourceToken("sp")}
                max={stats?.maxSp}
                min={stats?.sp}
                width={isBig ? 100 : 50}
                height={6}
                showText={false}
              />
            </>
          )}
          {/* Mobs have no experience to show */}
          {isBig && player?.kind === "player" && (
            <Bar
              data-tooltip-content={`EXP: ${stats?.exp} / ${stats?.maxExp}`}
              color="purple.400"
              max={stats?.maxExp}
              min={stats?.exp}
              height={6}
              showText={false}
            />
          )}
          {/* Right under the name on a small plate, which has no bars between them. Pulled left by the
              empty edge around the buff art (5 of its 32px, so about 4 at 24), so the icons line
              up with the name */}
          <Buffs
            player={player}
            sx={isBig ? { mt: 0 } : { mt: "-2px", ml: "-4px" }}
            wrapRows={isBig ? undefined : MINI_BUFF_ROWS}
          />
        </Flex>
        <Memoized
          as={LevelIcon}
          player={player}
          sx={!isBig ? MINI_LEVEL : {}}
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

/** Fade-out duration for proximity plates; WebRTC teardown is delayed to match (see VideoFrame). */
const NEARBY_EXIT_MS = 380;
/** Fade-in duration for a proximity plate when a player comes into range. */
const NEARBY_FADE_IN_MS = 380;

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
  const { owned, foes, hovered } = useNpcPlates();
  const [nearbySocketIds, setNearbySocketIds] = useState<string[]>([]);
  const [exitingNearbyIds, setExitingNearbyIds] = useState<Set<string>>(() => new Set());
  const nearbyExitTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const partyIds = party?.members
    ?.map((p: { id?: string }) => p?.id)
    ?.filter((id): id is string => !!id && hero?.id !== id);
  const hasParty = (partyIds?.length ?? 0) > 0;
  const videoChatOn = !!userSettings?.videoChat;

  const heroPortraitVideo =
    videoChatOn && streamHasUsableVideo(localVideoChatStream) ? localVideoChatStream : null;

  /* Disconnecting clears the nearby list */
  if (!isConnected && (nearbySocketIds.length > 0 || exitingNearbyIds.size > 0)) {
    setNearbySocketIds([]);
    setExitingNearbyIds(new Set());
  }

  useEffect(() => {
    if (isConnected) return;
    nearbyExitTimersRef.current.forEach((t) => clearTimeout(t));
    nearbyExitTimersRef.current.clear();
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
      {/* Your party, your pets and followers, players near you, foes fighting you, then the NPC under
          the cursor */}
      <Grid sx={PLATE_GRID}>
        {hasParty &&
          partyIds?.map((id: string) => {
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
        {owned.map((npc) => (
          <PlayerHud player={npc as Partial<HudCharacter>} isBig={false} key={npc.id} />
        ))}
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
                transition: `opacity ${NEARBY_EXIT_MS}ms ease-out`,
                animation: `nearby-plate-in ${NEARBY_FADE_IN_MS}ms ease-out`,
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
        {[...foes, ...(hovered ? [hovered] : [])].map((npc) => (
          <PlayerHud player={npc as Partial<HudCharacter>} isBig={false} key={npc.id} />
        ))}
      </Grid>
    </Box>
  );
};

const Memoized = memo(
  (
    props: { as?: ElementType; player?: unknown; memoProps?: unknown } & Record<string, unknown>,
  ) => {
    const { as: As = Text } = props;
    return <As {...props}></As>;
  },
  (prev, next) => {
    if (prev?.player && !next?.player) return true;
    if (JSON.stringify(prev?.memoProps) === JSON.stringify(next?.memoProps)) return true;
    return false;
  },
);

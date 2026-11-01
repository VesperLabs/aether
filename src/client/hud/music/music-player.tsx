import { useEffect, useRef, useState } from "react";
import { Box, Flex, Text, isMobile } from "@/ui";
import { MINI_MAP_MARGIN, MINI_MAP_SIZE } from "@/client/views/minimap-size";
import { useAppContext } from "@/client/hud/app/context";
import { usePersistSetting } from "@/client/hud/settings/use-persist-setting";
import type { SceneMain } from "@/client/scenes/main-scene";

interface NowPlaying {
  name: string;
  seek: number;
  duration: number;
}

/** 83.4 → "1:23" */
const formatTime = (seconds: number) => {
  const s = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** "./assets/music/grassland.mp3" → "Grassland" */
const trackName = (key: string) => {
  const base =
    key
      .split("/")
      .pop()
      ?.replace(/\.\w+$/, "") ?? key;
  return base.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const readNowPlaying = (scene?: SceneMain): NowPlaying | null => {
  /* Sound effects play too; only report the music track. */
  const sound = scene?.sound?.getAllPlaying?.().find((s) => s.key.includes("/music/")) as
    | Phaser.Sound.WebAudioSound
    | undefined;
  if (!sound) return null;
  const duration =
    [sound.duration, sound.totalDuration].find((d) => Number.isFinite(d) && d > 0) ?? 0;
  const seek = Number.isFinite(sound.seek) ? sound.seek : 0;
  return {
    name: trackName(sound.key),
    seek: duration ? Math.min(seek, duration) : 0,
    duration,
  };
};

const BAR_DELAYS = ["0s", "-0.4s", "-0.2s"];

/** Three bouncing bars while music plays. */
const Equalizer = ({ playing }: { playing: boolean }) => (
  <Flex sx={{ alignItems: "end", gap: "2px", height: 10 }}>
    {BAR_DELAYS.map((delay) => (
      <Box
        key={delay}
        sx={{
          width: 2,
          height: "100%",
          borderRadius: 999,
          bg: "white",
          transformOrigin: "bottom",
          transform: "scaleY(0.3)",
          animation: playing ? `music-eq 0.9s ease-in-out ${delay} infinite` : "none",
        }}
      />
    ))}
  </Flex>
);

const COLLAPSE_DELAY = 2500;

/**
 * Glass disc under the minimap with a bouncing equalizer. Hover or tap expands it to show
 * the track, time and progress; the disc toggles `playMusic`.
 */
export const MusicPlayer = () => {
  const { game, userSettings, zoom } = useAppContext();
  const persistSetting = usePersistSetting();
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [expanded, setExpanded] = useState(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const playMusic = !!userSettings?.playMusic;
  const current = playMusic ? nowPlaying : null;
  const progress = current?.duration ? current.seek / current.duration : 0;
  const scale = isMobile ? 1 : Number(zoom) || 1;
  const top =
    !isMobile && userSettings?.showMinimap ? MINI_MAP_MARGIN + MINI_MAP_SIZE + 6 : MINI_MAP_MARGIN;

  useEffect(() => {
    const getScene = () => game?.scene?.getScene("SceneMain") as SceneMain | undefined;
    const tick = () => setNowPlaying(readNowPlaying(getScene()));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [game]);

  useEffect(() => () => clearTimeout(collapseTimer.current), []);

  const expand = () => {
    clearTimeout(collapseTimer.current);
    setExpanded(true);
  };
  const collapseSoon = () => {
    clearTimeout(collapseTimer.current);
    collapseTimer.current = setTimeout(() => setExpanded(false), COLLAPSE_DELAY);
  };

  const toggle = () => {
    /* On touch the first tap only opens the player. */
    if (isMobile && !expanded) {
      expand();
      collapseSoon();
      return;
    }
    const next = !playMusic;
    persistSetting("playMusic", next);
    /* Apply right away so guests (no server echo) hear the change too. */
    const scene = game?.scene?.getScene("SceneMain") as SceneMain | undefined;
    if (scene) {
      scene.userSettings = { ...scene.userSettings, playMusic: next };
      scene.toggleMusic(next);
    }
    if (isMobile) collapseSoon();
  };

  return (
    <Flex
      onMouseEnter={expand}
      onMouseLeave={collapseSoon}
      sx={{
        position: "fixed",
        top,
        right: MINI_MAP_MARGIN,
        transform: `scale(${scale})`,
        transformOrigin: "top right",
        zIndex: "menus",
        alignItems: "center",
        flexDirection: "row-reverse",
        gap: 2,
        p: "4px",
        pl: expanded ? 3 : "4px",
        borderRadius: 999,
        bg: "shadow.30",
        backdropFilter: "blur(10px)",
        pointerEvents: "all",
        fontSize: 0,
        maxWidth: expanded ? 200 : 30,
        overflow: "hidden",
        transition: "max-width 0.25s ease, padding 0.25s ease",
        "@keyframes music-eq": {
          "0%, 100%": { transform: "scaleY(0.3)" },
          "50%": { transform: "scaleY(1)" },
        },
      }}
    >
      <Box
        as="button"
        aria-label={playMusic ? "Stop music" : "Play music"}
        title={playMusic ? "Stop music" : "Play music"}
        onClick={toggle}
        sx={{
          all: "unset",
          cursor: "pointer",
          flexShrink: 0,
          width: 22,
          height: 22,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "9px",
          color: "white",
          bg: "shadow.30",
          opacity: playMusic ? 1 : 0.6,
          "&:hover": { opacity: 1 },
        }}
      >
        {expanded ? (
          playMusic ? (
            "■"
          ) : (
            "▶"
          )
        ) : current ? (
          <Equalizer playing />
        ) : (
          /* Flat bars read as "...", so show a note when nothing plays */
          <Text sx={{ fontSize: "13px", lineHeight: 1 }}>♪</Text>
        )}
      </Box>
      <Flex
        sx={{
          flexDirection: "column",
          gap: "4px",
          width: 150,
          flexShrink: 0,
          opacity: expanded ? 1 : 0,
          transition: "opacity 0.2s ease",
        }}
      >
        <Flex sx={{ alignItems: "baseline", gap: 2, lineHeight: 1, color: "white" }}>
          <Text
            sx={{
              flex: 1,
              minWidth: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              opacity: playMusic ? 1 : 0.6,
            }}
          >
            {playMusic ? (nowPlaying?.name ?? "No music here") : "Music off"}
          </Text>
          {current && current.duration > 0 && (
            <Text sx={{ fontSize: "9px", opacity: 0.7, fontVariantNumeric: "tabular-nums" }}>
              {formatTime(current.seek)} / {formatTime(current.duration)}
            </Text>
          )}
        </Flex>
        <Box sx={{ height: 3, borderRadius: 999, overflow: "hidden", bg: "shadow.30" }}>
          <Box
            sx={{
              height: "100%",
              bg: "white",
              opacity: 0.7,
              borderRadius: 999,
              width: `${progress * 100}%`,
              transition: "width 0.5s linear",
            }}
          />
        </Box>
      </Flex>
    </Flex>
  );
};

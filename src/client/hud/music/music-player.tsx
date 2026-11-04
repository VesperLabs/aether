import { type ChangeEvent, type PointerEvent, useEffect, useRef, useState } from "react";
import type { ThemeUICSSObject } from "theme-ui";
import { Box, Flex, Text } from "@/ui";
import { DEFAULT_USER_SETTINGS } from "@/rules/world";
import { useAppContext } from "@/client/hud/app/context";
import { usePersistSetting } from "@/client/hud/settings/use-persist-setting";
import type { SceneMain } from "@/client/scenes/main-scene";
import { DISC_SIZE, DiscButton, GLASS_PILL } from "@/client/hud/app/glass-disc";

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

const SAVE_DELAY = 400;

/** Speaker with a wave, or without one when muted. */
const VolumeIcon = ({ muted }: { muted: boolean }) => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 10 10"
    fill="white"
    aria-hidden
    style={{ flexShrink: 0 }}
  >
    <path d="M0.5 3.5h2L5.5 1v8L2.5 6.5h-2z" />
    {!muted && (
      <path
        d="M7 3a3 3 0 0 1 0 4"
        fill="none"
        stroke="white"
        strokeWidth="1"
        strokeLinecap="round"
      />
    )}
  </svg>
);

const SLIDER_THUMB: ThemeUICSSObject = {
  appearance: "none",
  width: 8,
  height: 8,
  border: "none",
  borderRadius: "50%",
  bg: "white",
};

/**
 * Glass disc with a bouncing equalizer, in the top right bar. Clicking it opens the track, time,
 * volume and a play/stop button.
 */
export const MusicPlayer = () => {
  const { game, userSettings } = useAppContext();
  const persistSetting = usePersistSetting();
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [draftVolume, setDraftVolume] = useState<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const playMusic = !!userSettings?.playMusic;
  const current = playMusic ? nowPlaying : null;

  useEffect(() => {
    const getScene = () => game?.scene?.getScene("SceneMain") as SceneMain | undefined;
    const tick = () => setNowPlaying(readNowPlaying(getScene()));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [game]);

  const musicVolume = draftVolume ?? userSettings?.musicVolume ?? DEFAULT_USER_SETTINGS.musicVolume;
  /* Heard at once, saved once the slider settles: a drag fires dozens of changes. */
  const changeVolume = (value: number) => {
    setDraftVolume(value);
    const scene = game?.scene?.getScene("SceneMain") as SceneMain | undefined;
    if (scene) {
      scene.userSettings = { ...scene.userSettings, musicVolume: value };
      scene.setMusicVolume(value);
    }
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persistSetting("musicVolume", value);
      setDraftVolume(null);
    }, SAVE_DELAY);
  };

  const toggle = () => {
    const next = !playMusic;
    persistSetting("playMusic", next);
    /* Apply right away so guests (no server echo) hear the change too. */
    const scene = game?.scene?.getScene("SceneMain") as SceneMain | undefined;
    if (scene) {
      scene.userSettings = { ...scene.userSettings, playMusic: next };
      scene.toggleMusic(next);
    }
  };

  return (
    <Flex
      sx={{
        alignItems: "center",
        flexDirection: "row-reverse",
        gap: 2,
        ...GLASS_PILL,
        fontSize: 0,
        maxWidth: expanded ? 220 : DISC_SIZE,
        overflow: "hidden",
        transition: "max-width 0.25s ease, padding 0.25s ease",
        "@keyframes music-eq": {
          "0%, 100%": { transform: "scaleY(0.3)" },
          "50%": { transform: "scaleY(1)" },
        },
      }}
    >
      <DiscButton
        label={expanded ? "Close music player" : "Open music player"}
        onClick={() => setExpanded(!expanded)}
      >
        {current ? (
          <Equalizer playing />
        ) : (
          /* Flat bars read as "...", so show a note when nothing plays */
          <Text sx={{ fontSize: "13px", lineHeight: 1 }}>♪</Text>
        )}
      </DiscButton>
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
        <Flex sx={{ alignItems: "center", gap: "6px", opacity: playMusic ? 1 : 0.5 }}>
          <VolumeIcon muted={musicVolume === 0} />
          <Box
            as="input"
            {...{
              type: "range",
              min: 0,
              max: 100,
              value: Math.round(musicVolume * 100),
              disabled: !playMusic,
              tabIndex: expanded ? 0 : -1,
              title: "Music volume",
              "aria-label": "Music volume",
              onChange: (e: ChangeEvent<HTMLInputElement>) =>
                changeVolume(Number(e.target.value) / 100),
              /* Never keep focus, or the slider eats the game's movement keys */
              onPointerUp: (e: PointerEvent<HTMLInputElement>) => {
                e.currentTarget.blur();
              },
            }}
            sx={{
              appearance: "none",
              flex: 1,
              minWidth: 0,
              height: 3,
              m: 0,
              borderRadius: 999,
              outline: "none",
              cursor: playMusic ? "pointer" : "default",
              background: `linear-gradient(to right, white ${musicVolume * 100}%, rgba(255, 255, 255, 0.25) ${musicVolume * 100}%)`,
              "&::-webkit-slider-thumb": SLIDER_THUMB,
              "&::-moz-range-thumb": SLIDER_THUMB,
            }}
          />
        </Flex>
      </Flex>
      {expanded && (
        <DiscButton label={playMusic ? "Stop music" : "Play music"} onClick={toggle}>
          {playMusic ? "■" : "▶"}
        </DiscButton>
      )}
    </Flex>
  );
};

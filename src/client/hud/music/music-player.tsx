import { useEffect, useState } from "react";
import { Box, Flex, Slider, Text } from "@/ui";
import { useAppContext } from "@/client/hud/app/context";
import { useAudioToggle, useVolumeSetting } from "@/client/hud/settings/use-audio-settings";
import type { SceneMain } from "@/client/scenes/main-scene";
import { DISC_SIZE, DiscButton, GLASS_PILL } from "@/client/hud/app/glass-disc";
import { MarqueeText } from "./marquee-text";

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

/**
 * Glass disc with a bouncing equalizer, in the top right bar. Clicking it opens the track, time,
 * volume and a play/stop button.
 */
export const MusicPlayer = () => {
  const { game, userSettings } = useAppContext();
  const [musicVolume, changeVolume] = useVolumeSetting("musicVolume");
  const toggleMusic = useAudioToggle("playMusic");
  const toggleSfx = useAudioToggle("playSfx");
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [expanded, setExpanded] = useState(false);
  const playMusic = !!userSettings?.playMusic;
  const playSfx = !!userSettings?.playSfx;
  const current = playMusic ? nowPlaying : null;

  useEffect(() => {
    const getScene = () => game?.scene?.getScene("SceneMain") as SceneMain | undefined;
    const tick = () => setNowPlaying(readNowPlaying(getScene()));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [game]);

  return (
    <Flex
      sx={{
        alignItems: "center",
        flexDirection: "row-reverse",
        gap: 2,
        ...GLASS_PILL,
        fontSize: 0,
        maxWidth: expanded ? 226 : DISC_SIZE,
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
          width: 120,
          flexShrink: 0,
          opacity: expanded ? 1 : 0,
          transition: "opacity 0.2s ease",
        }}
      >
        <Flex sx={{ alignItems: "baseline", gap: 2, lineHeight: 1, color: "white" }}>
          <MarqueeText
            text={playMusic ? (nowPlaying?.name ?? "No music here") : "Music off"}
            trailing={
              current && current.duration > 0
                ? `${formatTime(current.seek)} / ${formatTime(current.duration)}`
                : undefined
            }
            running={expanded}
            sx={{
              flex: 1,
              minWidth: 0,
              fontSize: "9px",
              opacity: playMusic ? 1 : 0.6,
            }}
          />
        </Flex>
        <Flex sx={{ alignItems: "center", gap: "6px", opacity: playMusic ? 1 : 0.5 }}>
          <VolumeIcon muted={musicVolume === 0} />
          <Slider
            label="Music volume"
            value={musicVolume}
            onChange={changeVolume}
            disabled={!playMusic}
            tabIndex={expanded ? 0 : -1}
          />
        </Flex>
      </Flex>
      {expanded && (
        <DiscButton
          label={playMusic ? "Stop music" : "Play music"}
          onClick={() => toggleMusic(!playMusic)}
        >
          {playMusic ? "■" : "▶"}
        </DiscButton>
      )}
      {expanded && (
        <DiscButton
          label={playSfx ? "Turn sound effects off" : "Turn sound effects on"}
          onClick={() => toggleSfx(!playSfx)}
          dim={!playSfx}
        >
          FX
        </DiscButton>
      )}
    </Flex>
  );
};

import { arePropsEqualWithKeys } from "@aether/shared";
import { Box, PlayerRender } from "@aether/ui";
import { memo, useEffect, useLayoutEffect, useRef, useState, type AnimationEvent } from "react";
import { streamHasUsableVideo } from "./videoChatUtils";

const applyRoundedStyle = ({ size }: { size: number }) => {
  return {
    border: `1px solid #000`,
    borderRadius: size,
    width: size + 2,
    height: size + 2,
    "& > div": {
      border: `1px solid #FFF`,
      borderRadius: size,
      width: size,
      height: size,
      bg: "shadow.30",
      position: "relative",
      overflow: "hidden",
      clipPath: `circle(${size / 2}px at ${size / 2}px ${size / 2}px)`,
    },
  };
};

function PortraitVideo({ stream, muted = false }: { stream: MediaStream; muted?: boolean }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    el.playsInline = true;
    const play = () => el.play().catch(() => {});
    el.addEventListener("loadedmetadata", play, { once: true });
    play();
  }, [stream]);

  return (
    <video
      ref={ref}
      muted={muted}
      playsInline
      autoPlay
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />
  );
}

const Portrait = memo(
  ({
    player,
    size = 54,
    topOffset = 10,
    scale = 1,
    filteredSlots = [],
    sx,
    videoStream,
    muteVideo = false,
  }: {
    player: FullCharacterState;
    size?: integer;
    topOffset?: integer;
    scale?: number;
    filteredSlots?: string[];
    sx?: any;
    /** When set and usable, shows camera in the portrait circle instead of the character sprite. */
    videoStream?: MediaStream | null;
    /** Mute the video element — set true only for the local self-preview to avoid echo. */
    muteVideo?: boolean;
  }) => {
    const streamOk = !!(videoStream && streamHasUsableVideo(videoStream));
    const prevStreamOk = useRef(streamOk);
    const [videoExiting, setVideoExiting] = useState(false);

    useLayoutEffect(() => {
      if (streamOk) {
        setVideoExiting(false);
      } else if (prevStreamOk.current && !streamOk) {
        setVideoExiting(true);
      }
      prevStreamOk.current = streamOk;
    }, [streamOk]);

    /* Fallback if animationend does not fire (e.g. reduced motion quirks). */
    useEffect(() => {
      if (!videoExiting || streamOk) return;
      const t = window.setTimeout(() => setVideoExiting(false), 450);
      return () => window.clearTimeout(t);
    }, [videoExiting, streamOk]);

    const showVideoLayer = streamOk || videoExiting;

    const pipClass =
      streamOk && !videoExiting
        ? "video-chat-self-wrap"
        : videoExiting && !streamOk
          ? "video-chat-pip-out"
          : undefined;

    const handleAnimationEnd = (e: AnimationEvent<HTMLDivElement>) => {
      if (e.animationName !== "video-chat-pip-out") return;
      setVideoExiting(false);
    };

    return (
      <Box
        className={pipClass}
        onAnimationEnd={handleAnimationEnd}
        sx={{
          ...applyRoundedStyle({ size }),
          ...sx,
        }}
      >
        <Box sx={{ position: "relative" }}>
          {showVideoLayer ? (
            videoStream ? (
              <PortraitVideo stream={videoStream} muted={muteVideo} />
            ) : (
              <Box sx={{ position: "absolute", inset: 0, bg: "shadow.30" }} />
            )
          ) : (
            <PlayerRender
              player={player}
              filteredSlots={filteredSlots}
              sx={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: `translate(-50%,-50%) scale(${scale})`,
                mt: topOffset,
              }}
            />
          )}
        </Box>
      </Box>
    );
  },
  (prev, next) => {
    if (prev.videoStream !== next.videoStream) return false;
    return arePropsEqualWithKeys([
      "player.activeItemSlots",
      "player.equipment",
      "player.profile",
    ])(prev, next);
  }
);

export default Portrait;

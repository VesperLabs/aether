import { useEffect, useRef, useState } from "react";
import { Flex } from "@aether/ui";
import { isMobile } from "../../shared/utils";
import { useAppContext } from "../ui";
import { useOnMountUnsafe } from "./useOnMountSafe";
import { MediaConnection } from "peerjs";

const peers: Record<string, MediaConnection> = {};
const VIDEO_SIZE = "8vh";

export default function VideoFrame() {
  const { peer, userSettings } = useAppContext();
  const videoGridRef = useRef(null);
  const showVideo = userSettings?.videoChat;

  const myStream = useUserMedia({
    video: {
      width: { min: 100, ideal: 320 },
      height: { min: 100, ideal: 320 },
    },
    audio: {
      sampleSize: 16,
      channelCount: 2,
    },
  });

  function connectToNewUser(peerId, stream) {
    const call: MediaConnection = peer.call(peerId, stream);
    const video = document.createElement("video");
    call.once("stream", (userVideoStream) => {
      addVideoStream(video, userVideoStream, peerId);
    });
    call.once("close", () => {
      document.getElementById(peerId).remove();
      delete peers[peerId];
    });

    peers[peerId] = call;
  }

  function addVideoStream(video, stream, peerId?: string) {
    video.id = peerId;
    if (peerId === "me") {
      video.muted = true;
    }
    video.srcObject = stream;
    video.addEventListener("loadedmetadata", () => {
      video.play();
    });
    if (!document.getElementById(peerId)) {
      videoGridRef.current.append(video);
    }
  }

  useEffect(() => {
    // If the conditions aren't met, don't set up the effect.
    if (!showVideo || !myStream) return;

    // Function to handle incoming calls.
    const handleCall = (call) => {
      call.answer(myStream);
      const video = document.createElement("video");
      call.once("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream, call?.peer);
      });
    };

    // Function to handle new user connection.
    const handleHeroNearPlayer = (e: CustomEvent) => {
      const peerId = e?.detail?.peerId;
      connectToNewUser(peerId, myStream);
    };

    // Function to handle user disconnection.
    const handleHeroAwayPlayer = (e: CustomEvent) => {
      const peerId = e?.detail?.peerId;
      if (peers[peerId]) {
        peers[peerId].close();
      }
    };

    peer.on("call", handleCall);
    window.addEventListener("HERO_NEAR_PLAYER", handleHeroNearPlayer);
    window.addEventListener("HERO_AWAY_PLAYER", handleHeroAwayPlayer);

    return () => {
      peer.off("call", handleCall);
      window.removeEventListener("HERO_NEAR_PLAYER", handleHeroNearPlayer);
      window.removeEventListener("HERO_AWAY_PLAYER", handleHeroAwayPlayer);
      Object.values(peers).forEach((peerCall: MediaConnection) => {
        peerCall.close();
      });
    };
  }, [showVideo, isMobile, myStream]);

  return showVideo ? (
    <Flex
      className="video-chat"
      sx={{
        pointerEvents: "none",
        justifyContent: "center",
        zIndex: 9999,
        position: "fixed",
        inset: "0 0 0 0",
        gap: 2,

        "& video": {
          width: VIDEO_SIZE,
          height: VIDEO_SIZE,
          borderRadius: "100%",
          objectFit: "cover",
        },
      }}
    >
      {myStream?.active && <Video isMuted={true} stream={myStream} />}
      <div id="video-grid" ref={videoGridRef}></div>
    </Flex>
  ) : null;
}

const Video = ({ stream, isMuted = false, peerId = "me" }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted={isMuted}
      playsInline // This is often needed for auto-play to work on mobile devices
      id={peerId}
    />
  );
};

export function useUserMedia(requestedMedia) {
  const [mediaStream, setMediaStream] = useState(null);

  useOnMountUnsafe(() => {
    async function enableStream() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(requestedMedia);
        setMediaStream(stream);
      } catch (err) {
        setMediaStream(new MediaStream());
      }
    }

    if (!mediaStream) {
      enableStream();
    }
  });

  return mediaStream;
}

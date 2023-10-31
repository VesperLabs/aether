import { useRef } from "react";
import { Modal } from "@aether/ui";
import { isMobile } from "../../shared/utils";
import { useAppContext } from "../ui";
import { useOnMountUnsafe } from "./useOnMountSafe";

const peers = {};

function VideoFrame() {
  const { peer, socket } = useAppContext();
  const myVideoRef = useRef(null);
  const videoGridRef = useRef(null);

  useOnMountUnsafe(() => {
    if (isMobile) return;
    // tell the server which peer we are
    peer.on("open", (peerId) => {
      socket.emit("peerInit", peerId);
    });

    navigator.mediaDevices
      .getUserMedia({
        video: { height: 300, width: 300 },
        audio: true,
      })
      .then((stream) => {
        addVideoStream(myVideoRef.current, stream, "me");

        peer.on("call", (call) => {
          call.answer(stream);
          const video = document.createElement("video");
          call.on("stream", (userVideoStream) => {
            addVideoStream(video, userVideoStream, call?.peer);
          });
        });

        window.addEventListener("HERO_NEAR_PLAYER", (e: CustomEvent) => {
          const peerId = e?.detail?.peerId;

          connectToNewUser(peerId, stream);
        });
      });

    window.addEventListener("HERO_AWAY_PLAYER", (e: CustomEvent) => {
      const peerId = e?.detail?.peerId;
      if (peers[peerId]) {
        peers[peerId].close();
      }
    });
  });

  function connectToNewUser(peerId, stream) {
    const call = peer.call(peerId, stream);
    const video = document.createElement("video");
    call.on("stream", (userVideoStream) => {
      addVideoStream(video, userVideoStream, peerId);
    });
    call.on("close", () => {
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

  return (
    <Modal>
      <Modal.Body sx={{ "& video": { width: 100, height: 100 } }}>
        <video src="" autoPlay={true} muted={true} ref={myVideoRef}></video>
        <div id="video-grid" ref={videoGridRef}></div>
      </Modal.Body>
    </Modal>
  );
}

export default VideoFrame;

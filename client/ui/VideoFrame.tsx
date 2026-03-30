import { useEffect, useReducer, useRef, useState } from "react";
import { useAppContext } from "../ui";
import { MediaConnection } from "peerjs";
import { streamHasUsableVideo, canUseVideoChat } from "./videoChatUtils";

const DEFAULT_MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    width: { min: 160, ideal: 480, max: 1280 },
    height: { min: 120, ideal: 360, max: 720 },
    facingMode: "user",
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    channelCount: 1,
  },
};

/** Only the lexicographically smaller PeerJS id initiates the call — avoids WebRTC glare when both sides called each other. */
function shouldInitiateCall(myPeerId: string | null, remotePeerId: string): boolean {
  if (!myPeerId || !remotePeerId || myPeerId === remotePeerId) return false;
  return myPeerId < remotePeerId;
}

/** Match MenuHud proximity row fade-out so video doesn’t cut to black before the plate fades. */
const REMOTE_PEER_REMOVE_DELAY_MS = 380;

export default function VideoFrame() {
  const { peer, userSettings, setLocalVideoChatStream, setRemoteVideoStreams } = useAppContext();
  const peersRef = useRef<Record<string, MediaConnection>>({});
  const myPeerIdRef = useRef<string | null>(null);
  const awayRemoveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const showVideo = !!userSettings?.videoChat && canUseVideoChat();

  const myStream = useUserMedia(showVideo, DEFAULT_MEDIA_CONSTRAINTS);
  const [, resyncVideoUi] = useReducer((n: number) => n + 1, 0);

  const streamOk = streamHasUsableVideo(myStream);

  useEffect(() => {
    if (!showVideo) {
      setRemoteVideoStreams({});
    }
  }, [showVideo, setRemoteVideoStreams]);

  useEffect(() => {
    const syncId = () => {
      if (peer.open && peer.id) myPeerIdRef.current = peer.id;
    };
    syncId();
    peer.on("open", syncId);
    return () => {
      peer.off("open", syncId);
    };
  }, [peer]);

  useEffect(() => {
    if (!myStream) return;
    const tracks = myStream.getVideoTracks();
    const bump = () => resyncVideoUi();
    tracks.forEach((t) => {
      t.addEventListener("unmute", bump);
      t.addEventListener("mute", bump);
      t.addEventListener("ended", bump);
    });
    return () => {
      tracks.forEach((t) => {
        t.removeEventListener("unmute", bump);
        t.removeEventListener("mute", bump);
        t.removeEventListener("ended", bump);
      });
    };
  }, [myStream]);

  useEffect(() => {
    if (!showVideo) {
      setLocalVideoChatStream(null);
      return;
    }
    setLocalVideoChatStream(myStream);
    return () => setLocalVideoChatStream(null);
  }, [showVideo, myStream, setLocalVideoChatStream]);

  useEffect(() => {
    if (!showVideo || !streamOk) return;

    const peers = peersRef.current;

    function removeRemote(peerId: string) {
      const conn = peers[peerId];
      delete peers[peerId];
      conn?.close?.();
      setRemoteVideoStreams((prev) => {
        if (!(peerId in prev)) return prev;
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
    }

    function registerRemoteStream(peerId: string, stream: MediaStream) {
      setRemoteVideoStreams((prev) => ({ ...prev, [peerId]: stream }));
    }

    function attachCallDebug(call: MediaConnection, label: string) {
      const tag = `[WebRTC][${label}][${call.peer.slice(0, 8)}]`;
      call.on("iceStateChanged", (state) => console.log(`${tag} ICE state:`, state));
      call.peerConnection?.addEventListener("icecandidateerror", (e: Event) => {
        const ev = e as RTCPeerConnectionIceErrorEvent;
        console.warn(`${tag} ICE candidate error`, ev.errorCode, ev.errorText, ev.url);
      });
      call.peerConnection?.addEventListener("connectionstatechange", () =>
        console.log(`${tag} connection state:`, call.peerConnection?.connectionState)
      );
    }

    function connectToNewUser(remotePeerId: string, stream: MediaStream, forceRetry = false) {
      if (!remotePeerId || !streamHasUsableVideo(stream)) return;

      /* On forceRetry (resync), close any stale call so we can re-attempt. */
      if (peers[remotePeerId]) {
        if (!forceRetry) return;
        removeRemote(remotePeerId);
      }

      /* Prefer live peer.id — ref can lag; without id neither side initiates across NAT. */
      const myId = peer.open && peer.id ? peer.id : myPeerIdRef.current;
      console.log(`[WebRTC] connectToNewUser remote=${remotePeerId.slice(0, 8)} me=${myId?.slice(0, 8)} initiate=${shouldInitiateCall(myId, remotePeerId)}`);
      if (!shouldInitiateCall(myId, remotePeerId)) return;

      const call = peer.call(remotePeerId, stream);
      attachCallDebug(call, "outgoing");

      call.on("stream", (userVideoStream: MediaStream) => {
        console.log(`[WebRTC] outgoing stream received from ${remotePeerId.slice(0, 8)}`);
        registerRemoteStream(remotePeerId, userVideoStream);
      });
      call.on("close", () => { console.log(`[WebRTC] outgoing call closed ${remotePeerId.slice(0, 8)}`); removeRemote(remotePeerId); });
      call.on("error", (err) => { console.error(`[WebRTC] outgoing call error ${remotePeerId.slice(0, 8)}`, err); removeRemote(remotePeerId); });

      peers[remotePeerId] = call;
    }

    const handleCall = (call: MediaConnection) => {
      console.log(`[WebRTC] incoming call from ${call.peer.slice(0, 8)} myStreamOk=${streamHasUsableVideo(myStream)}`);
      if (!streamHasUsableVideo(myStream)) {
        call.close();
        return;
      }
      const remoteId = call.peer;
      /* Close any stale outgoing call so the incoming one wins. */
      if (peers[remoteId]) {
        peers[remoteId].close();
        delete peers[remoteId];
      }
      call.answer(myStream);
      attachCallDebug(call, "incoming");
      call.on("stream", (userVideoStream: MediaStream) => {
        console.log(`[WebRTC] incoming stream received from ${remoteId.slice(0, 8)}`);
        registerRemoteStream(remoteId, userVideoStream);
      });
      call.on("close", () => { console.log(`[WebRTC] incoming call closed ${remoteId.slice(0, 8)}`); removeRemote(remoteId); });
      call.on("error", (err) => { console.error(`[WebRTC] incoming call error ${remoteId.slice(0, 8)}`, err); removeRemote(remoteId); });
      peers[remoteId] = call;
    };

    const handleHeroNearPlayer = (e: Event) => {
      const peerId = (e as CustomEvent<{ peerId?: string }>)?.detail?.peerId;
      if (!peerId) return;
      const pending = awayRemoveTimersRef.current.get(peerId);
      if (pending) {
        clearTimeout(pending);
        awayRemoveTimersRef.current.delete(peerId);
      }
      connectToNewUser(peerId, myStream);
    };

    const handleHeroAwayPlayer = (e: Event) => {
      const peerId = (e as CustomEvent<{ peerId?: string }>)?.detail?.peerId;
      if (!peerId) return;
      const pending = awayRemoveTimersRef.current.get(peerId);
      if (pending) clearTimeout(pending);
      const t = setTimeout(() => {
        awayRemoveTimersRef.current.delete(peerId);
        removeRemote(peerId);
      }, REMOTE_PEER_REMOVE_DELAY_MS);
      awayRemoveTimersRef.current.set(peerId, t);
    };

    /* Resync for players who were already nearby when video chat was enabled.
       Dispatched AFTER listeners are attached so HERO_NEAR_PLAYER is caught. */
    const handleStreamReady = () => {
      for (const id of Object.keys(peers)) {
        connectToNewUser(id, myStream, true);
      }
      window.dispatchEvent(new CustomEvent("VIDEO_CHAT_STREAM_READY"));
    };

    peer.on("call", handleCall);
    peer.on("open", handleStreamReady);
    window.addEventListener("HERO_NEAR_PLAYER", handleHeroNearPlayer);
    window.addEventListener("HERO_AWAY_PLAYER", handleHeroAwayPlayer);

    /* Resync only after PeerJS signaling is open — otherwise shouldInitiateCall had no id and WAN never connected. */
    if (peer.open) handleStreamReady();

    return () => {
      awayRemoveTimersRef.current.forEach((timer) => clearTimeout(timer));
      awayRemoveTimersRef.current.clear();
      peer.off("call", handleCall);
      peer.off("open", handleStreamReady);
      window.removeEventListener("HERO_NEAR_PLAYER", handleHeroNearPlayer);
      window.removeEventListener("HERO_AWAY_PLAYER", handleHeroAwayPlayer);
      [...Object.keys(peers)].forEach((id) => removeRemote(id));
    };
  }, [showVideo, myStream, peer, streamOk, setRemoteVideoStreams]);

  return null;
}

export function useUserMedia(enabled: boolean, requestedMedia: MediaStreamConstraints) {
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (!enabled) {
      setMediaStream((prev) => {
        prev?.getTracks().forEach((t) => t.stop());
        return null;
      });
      return;
    }

    let cancelled = false;
    let stream: MediaStream | null = null;

    async function enableStream() {
      const gUM = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
      if (!gUM) {
        if (!cancelled) setMediaStream(new MediaStream());
        return;
      }
      /* iOS Safari often rejects { width: { min, ideal, max } }; try simpler constraints after failure. */
      const attempts: MediaStreamConstraints[] = [
        requestedMedia,
        {
          video: { facingMode: "user" },
          audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
        },
        { video: true, audio: true },
      ];
      for (const constraints of attempts) {
        try {
          stream = await gUM(constraints);
          if (!cancelled) setMediaStream(stream);
          return;
        } catch {
          stream?.getTracks().forEach((t) => t.stop());
          stream = null;
        }
      }
      if (!cancelled) setMediaStream(new MediaStream());
    }

    enableStream();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [enabled, requestedMedia]);

  return mediaStream;
}

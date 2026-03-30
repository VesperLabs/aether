import { util } from "peerjs";

/**
 * One extra STUN besides PeerJS defaults. Too many iceServers slows ICE gathering and can fail cross-network.
 * util.defaultConfig already has stun.l.google.com + PeerJS TURN.
 */
const EXTRA_STUN: RTCIceServer[] = [{ urls: "stun:stun1.l.google.com:19302" }];

/**
 * When direct peer-to-peer fails (symmetric NAT, strict firewalls), TURN relays media.
 * PeerJS ships eu/us TURN; this adds another public relay as fallback.
 * For production, prefer your own coturn (set TURN_URLS / TURN_USERNAME / TURN_CREDENTIAL).
 */
const PUBLIC_RELAY_TURN: RTCIceServer[] = [
  {
    urls: [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:443",
      "turn:openrelay.metered.ca:443?transport=tcp",
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

function parseOptionalEnvTurn(): RTCIceServer | null {
  const raw = process.env.TURN_URLS?.trim();
  if (!raw) return null;
  const urls = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (urls.length === 0) return null;
  const user = process.env.TURN_USERNAME?.trim();
  const cred = process.env.TURN_CREDENTIAL?.trim();
  return {
    urls: urls.length === 1 ? urls[0] : urls,
    ...(user && cred ? { username: user, credential: cred } : {}),
  };
}

/** RTC config for PeerJS — stronger ICE than util.defaultConfig alone for cross-network calls. */
export function getPeerRtcConfiguration(): RTCConfiguration {
  const base = util.defaultConfig as RTCConfiguration;
  const iceServers: RTCIceServer[] = [
    ...(base.iceServers ?? []),
    ...EXTRA_STUN,
    ...PUBLIC_RELAY_TURN,
  ];
  const envTurn = parseOptionalEnvTurn();
  if (envTurn) iceServers.push(envTurn);

  return {
    ...base,
    iceServers,
  };
}

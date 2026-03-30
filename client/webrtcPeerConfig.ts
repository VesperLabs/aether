import { util } from "peerjs";

/**
 * Reliable cross-network WebRTC: use [Metered](https://www.metered.ca/) TURN (free tier).
 * Set `METERED_APP_NAME` + `METERED_API_KEY` at build time (Vite `define`). The API key is
 * credential-scoped and intended for client use per Metered docs.
 *
 * GET `https://<appname>.metered.live/api/v1/turn/credentials?apiKey=...`
 *
 * Optional: `METERED_REGION` — Metered supports `global`, `us_east`, `europe`, etc. (match dashboard).
 */
const FALLBACK_STUN: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

function getFallbackRtcConfiguration(): RTCConfiguration {
  const base = util.defaultConfig as RTCConfiguration;
  return {
    ...base,
    iceServers: [...(base.iceServers ?? []), ...FALLBACK_STUN],
  };
}

export async function getPeerRtcConfiguration(): Promise<RTCConfiguration> {
  const app = process.env.METERED_APP_NAME?.trim();
  const apiKey = process.env.METERED_API_KEY?.trim();
  const base = util.defaultConfig as RTCConfiguration;

  if (app && apiKey) {
    try {
      const q = new URLSearchParams({ apiKey });
      const region = process.env.METERED_REGION?.trim();
      if (region) q.set("region", region);
      const url = `https://${app}.metered.live/api/v1/turn/credentials?${q.toString()}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Metered HTTP ${res.status}`);
      }
      const iceServers = (await res.json()) as RTCIceServer[];
      console.log("[WebRTC] Metered ICE servers loaded:", JSON.stringify(iceServers, null, 2));
      return {
        ...base,
        iceServers,
      };
    } catch (e) {
      console.warn("[WebRTC] Metered TURN credentials failed, using fallback ICE list.", e);
    }
  } else {
    console.warn("[WebRTC] METERED_APP_NAME or METERED_API_KEY not set — using fallback ICE (TURN unavailable).");
  }

  return getFallbackRtcConfiguration();
}

import type { Express } from "express";
import type { IncomingMessage, Server } from "http";
import type { Socket as NetSocket } from "net";
import { createProxyMiddleware } from "http-proxy-middleware";

/* Peer HTTP + WS: do NOT use ws:true — that subscribes to every `upgrade` on the shared
 * http.Server and can race Socket.IO behind Fly's edge (invalid WebSocket frame headers).
 * Socket.IO attaches first (GameServer); we only forward /peerjs upgrades manually. */
export function registerPeerProxy(app: Express, httpServer: Server, peerServerPort: number) {
  const peerProxy = createProxyMiddleware({
    /* Forward paths untouched: a target path plus pathRewrite turns `/peerjs?key=` into
     * `/peerjs/?key=`, which the peer WebSocket server rejects with 400. */
    target: `http://localhost:${peerServerPort}`,
    changeOrigin: true,
    ws: false,
    pathFilter: "/peerjs",
  });
  app.use(peerProxy);

  const peerUpgrade = (
    peerProxy as unknown as {
      upgrade?: (req: IncomingMessage, socket: NetSocket, head: Buffer) => void;
    }
  ).upgrade;

  httpServer.on("upgrade", (req, socket, head) => {
    const path = req.url?.split("?")[0] ?? "";
    if (!path.startsWith("/peerjs")) return;
    peerUpgrade?.(req, socket as NetSocket, head);
  });
}

import http from "node:http";
import type { AddressInfo } from "node:net";
import { initFakeDatabase } from "../persistence";
import { GameServer } from "../game-server";

/**
 * Boots the real game server in this process with a fake database and cheats on, on a free
 * port, for bots to play on when no dev server is running (tests, CI).
 */
export async function startLocalServer() {
  process.env.PUBLIC_DIR ??= "public";
  process.env.ENABLE_CHEATS = "true";
  const httpServer = http.createServer();
  const gameServer = new GameServer({ httpServer, db: await initFakeDatabase() });
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const { port } = httpServer.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    gameServer,
    close: () => {
      gameServer.close();
      httpServer.close();
    },
  };
}

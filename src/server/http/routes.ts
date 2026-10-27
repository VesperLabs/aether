import type { Express } from "express";

import type { Database } from "../persistence/database";
import type { GameServer } from "../game-server";
import { applyCalculatedStats } from "../character-stats";
import { getFullCharacterState } from "@/shared/network/sync";
import { paginate, parsePageQuery } from "./pagination";

/** Query string values as the client sent them; `pagination.ts` turns them into numbers. */
// oxlint-disable-next-line typescript/no-explicit-any
type UnparsedQuery = Record<string, any>;

interface RouteDeps {
  aetherServer: GameServer;
  db: Database;
}

/** The JSON endpoints the wiki and the host platform call. */
export function registerRoutes(app: Express, { aetherServer, db }: RouteDeps) {
  // app.get("/metrics/players", (req, res) => {
  //   const world = aetherServer.world;
  //   const { players } = world ?? {};
  //   const playerStates = Object.values(players).map(getFullCharacterState);
  //   res.json(playerStates);
  // });

  app.get("/keepers/all", async (req, res) => {
    const world = aetherServer.world;
    const { npcs } = world ?? {};

    const { page, pageSize } = req.query as UnparsedQuery;
    const keeperStates = Object.values(npcs)
      ?.filter((n) => n?.kind === "keeper" && n?.profile?.race === "human")
      .map(getFullCharacterState);
    res.json(paginate(keeperStates, page, pageSize, 10));
  });

  // Define an API route that supports pagination
  app.get("/players/all", async (req, res) => {
    const query = req.query as UnparsedQuery;
    const { page, pageSize } = parsePageQuery(query.page, query.pageSize, 20);
    const sortBy = query.sortBy ?? "updatedAt";

    const players = await db.getAllUsers({ page, pageSize, sortBy });

    const ret = players.map((player) => {
      applyCalculatedStats(player, false);
      return {
        id: player?._id,
        charClass: player?.charClass,
        stats: player?.stats,
        state: player?.state,
        abilities: player?.abilities,
        equipment: player?.equipment,
        inventory: player?.inventory,
        activeItemSlots: player?.activeItemSlots,
        profile: player?.profile,
        updatedAt: player?.updatedAt,
        quests: player?.quests,
      };
    });

    // Assuming you have the total count of users in the database
    const totalCount = await db.countAllUsers();

    // Calculate pagination information
    const hasNextPage = page * pageSize < totalCount;
    const nextPage = hasNextPage ? page + 1 : null;

    // Create the pageInfo object
    const pageInfo = {
      nextPage,
      hasNextPage,
      pageSize,
      currentPage: page,
      totalCount,
    };

    // Return the data along with pageInfo
    res.json({ data: ret, pageInfo });
  });

  app.get("/metrics", async (req, res) => {
    const world = aetherServer.world;
    const totalPlayers = await db.countAllUsers();
    const { players, npcs, loots, doors } = world ?? {};

    const endTime = Date.now();
    const clientTimestamp = req?.query?.timestamp
      ? parseInt(req?.query?.timestamp as string, 10)
      : endTime;

    const metrics: ServerMetrics = {
      playersOnline: Object.keys(players).length,
      totalPlayers: totalPlayers ?? 0,
      npcsLoaded: Object.keys(npcs).length,
      doorsLoaded: Object.keys(doors).length,
      lootsOnGround: Object.keys(loots).length,
      serverSpawnTime: aetherServer?.spawnTime,
      ping: endTime - clientTimestamp,
      serverTime: new Date().toString(),
      upTime: aetherServer?.getUptime(),
    };

    res.json(metrics);
  });

  app.get("/players/prune", async (_, res) => {
    await db.pruneNoobs();
    res.json({ string: "ok" });
  });

  app.get("/health", (_, res) => {
    res.status(200).json({ status: "ok" });
  });

  // app.get("/players/pruneItem", async (req, res) => {
  //   await db.pruneItemByKey("voltball");
  //   res.json({ string: "ok" });
  // });

  // app.get("/players/updateUsersMaxExp", async (req, res) => {
  //   await db.updateUsersMaxExp();
  //   res.json({ string: "ok" });
  // });
}

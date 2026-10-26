import type { ClientGameSocket, ServerToClientEvents } from "@/shared/network";

type WindowEventHandler<K extends keyof WindowEventMap> = (event: WindowEventMap[K]) => void;

/** The server messages the HUD listens to. */
export interface SocketHandlers {
  connect: () => void;
  disconnect: () => void;
  heroInit: ServerToClientEvents["heroInit"];
  buffUpdate: ServerToClientEvents["buffUpdate"];
  playerUpdate: ServerToClientEvents["playerUpdate"];
  lootGrabbed: ServerToClientEvents["lootGrabbed"];
  keeperDataUpdate: ServerToClientEvents["keeperDataUpdate"];
  message: ServerToClientEvents["message"];
  playerJoin: ServerToClientEvents["playerJoin"];
  remove: ServerToClientEvents["remove"];
  partyInvite: ServerToClientEvents["partyInvite"];
  partyUpdate: ServerToClientEvents["partyUpdate"];
  updateUserSetting: ServerToClientEvents["updateUserSetting"];
}

/** The window events (sent by the Phaser scenes and the HUD itself) the HUD listens to. */
export interface WindowHandlers {
  HERO_NEAR_NPC: WindowEventHandler<"HERO_NEAR_NPC">;
  HERO_CHAT_NPC: WindowEventHandler<"HERO_CHAT_NPC">;
  UPDATE_HUD: WindowEventHandler<"UPDATE_HUD">;
  UPDATE_ROOM_PLAYERS: WindowEventHandler<"UPDATE_ROOM_PLAYERS">;
  HERO_RESPAWN: WindowEventHandler<"HERO_RESPAWN">;
  LOAD_ERROR: WindowEventHandler<"LOAD_ERROR">;
  GAME_LOADED: WindowEventHandler<"GAME_LOADED">;
  HERO_START_COOLDOWN: WindowEventHandler<"HERO_START_COOLDOWN">;
  HERO_DROP_ITEM: WindowEventHandler<"HERO_DROP_ITEM">;
  HERO_DOUBLE_CLICK_ITEM: WindowEventHandler<"HERO_DOUBLE_CLICK_ITEM">;
}

/** Listens to every server message the HUD uses. Returns the function that stops listening. */
export function bindSocketHandlers(socket: ClientGameSocket, handlers: SocketHandlers) {
  socket.on("connect", handlers.connect);
  socket.on("disconnect", handlers.disconnect);
  socket.on("heroInit", handlers.heroInit);
  socket.on("buffUpdate", handlers.buffUpdate);
  socket.on("playerUpdate", handlers.playerUpdate);
  socket.on("lootGrabbed", handlers.lootGrabbed);
  socket.on("keeperDataUpdate", handlers.keeperDataUpdate);
  socket.on("message", handlers.message);
  socket.on("playerJoin", handlers.playerJoin);
  socket.on("remove", handlers.remove);
  socket.on("partyInvite", handlers.partyInvite);
  socket.on("partyUpdate", handlers.partyUpdate);
  socket.on("updateUserSetting", handlers.updateUserSetting);
  return () => {
    socket.off("connect", handlers.connect);
    socket.off("disconnect", handlers.disconnect);
    socket.off("heroInit", handlers.heroInit);
    socket.off("buffUpdate", handlers.buffUpdate);
    socket.off("playerUpdate", handlers.playerUpdate);
    socket.off("lootGrabbed", handlers.lootGrabbed);
    socket.off("keeperDataUpdate", handlers.keeperDataUpdate);
    socket.off("message", handlers.message);
    socket.off("playerJoin", handlers.playerJoin);
    socket.off("remove", handlers.remove);
    socket.off("partyInvite", handlers.partyInvite);
    socket.off("partyUpdate", handlers.partyUpdate);
    socket.off("updateUserSetting", handlers.updateUserSetting);
  };
}

/** Listens to every window event the HUD uses. Returns the function that stops listening. */
export function bindWindowHandlers(handlers: WindowHandlers) {
  const names = Object.keys(handlers) as Array<keyof WindowHandlers>;
  const listeners = names.map(
    (name) => [name, handlers[name] as unknown as EventListener] as const,
  );
  for (const [name, listener] of listeners) window.addEventListener(name, listener);
  return () => {
    for (const [name, listener] of listeners) window.removeEventListener(name, listener);
  };
}

import { Bot } from "@/bots";
import { readRoomMap } from "../map-files";
import { realClock } from "./real-clock";
import { connectSocketLink } from "./socket-link";

/** Connects a cheat-enabled test bot to a server over socket.io and logs it in. */
export async function joinTestBot(url: string, name: string, charClass?: string) {
  const link = await connectSocketLink(url);
  return Bot.join(link, {
    name,
    charClass,
    clock: realClock,
    maps: readRoomMap,
    cheats: true,
  });
}

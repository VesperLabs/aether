import { demoLogin, login, ticketLogin } from "../../auth/commands";
import type { CommandHandlers } from "../dispatcher";
import { attack, cancelCastCommand, castSpell, startCast } from "./combat";
import { throwItem } from "./capture";
import { consumeItem, dropItem, grabLoot } from "./inventory";
import { moveItem } from "./inventory-move";
import {
  changeDirection,
  dodge,
  enterDoor,
  playerInput,
  reportLag,
  respawn,
  setSpawn,
  updateState,
} from "./movement";
import { observe } from "./observe";
import { updateProfile } from "./profile";
import { latency, peerConnect, peerInit, updateUserSetting } from "./session";
import {
  acceptQuest,
  chatNpc,
  completeQuest,
  inviteToParty,
  message,
  partyAccept,
  partyLeave,
} from "./social";

/** Which function answers which command. The compiler fails here if a command has no handler. */
export const commandHandlers: CommandHandlers = {
  demoLogin,
  login,
  ticketLogin,
  observe,
  latency,
  attack,
  castSpell,
  startCast,
  cancelCast: cancelCastCommand,
  playerInput,
  changeDirection,
  dodge,
  updateState,
  reportLag,
  enterDoor,
  respawn,
  setSpawn,
  grabLoot,
  dropItem,
  moveItem,
  consumeItem,
  throwItem,
  message,
  chatNpc,
  acceptQuest,
  completeQuest,
  inviteToParty,
  partyAccept,
  partyLeave,
  updateProfile,
  updateUserSetting,
  peerInit,
  peerConnect,
};

import { demoLogin, login, register } from "../../auth/commands";
import type { CommandHandlers } from "../dispatcher";
import { attack, castSpell } from "./combat";
import { consumeItem, dropItem, grabLoot } from "./inventory";
import { moveItem } from "./inventory-move";
import {
  changeDirection,
  enterDoor,
  playerInput,
  respawn,
  setSpawn,
  updateState,
} from "./movement";
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
  register,
  latency,
  attack,
  castSpell,
  playerInput,
  changeDirection,
  updateState,
  enterDoor,
  respawn,
  setSpawn,
  grabLoot,
  dropItem,
  moveItem,
  consumeItem,
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

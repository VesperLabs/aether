import type { Logger } from "@/server/log/logger";
import type { Dice } from "@/content/items/dice";
import { createServerDice } from "@/server/world/server-dice";
import { createBaseUser } from "./base-user";
import type { Database, UserDocument } from "./database";

export async function initFakeDatabase(
  log: Logger,
  dice: Dice = createServerDice(),
): Promise<Database> {
  return getDatabaseApi(dice, log);
}

const getDatabaseApi = (dice: Dice, log: Logger): Database => ({
  getAllUsers: async () => [],
  countAllUsers: async () => 0,
  pruneNoobs: async () => {},
  createUser: async () => true,
  updateUser: async () => {},
  updateUserMapDetails: async () => {},
  updateUserSetting: async () => {},
  pruneItemByKey: async () => {},
  updateUsersMaxExp: async () => {},
  getUserByEmail: async ({ email }) => {
    if (!email) return log.warn("❌ Email not provided");
    return { email, ...createBaseUser(dice, "rogue") } as UserDocument;
  },
  getUserByLogin: async ({ email }) => {
    if (!email) return log.warn("❌ Email not provided");
    return { email, ...createBaseUser(dice, "rogue") } as UserDocument;
  },
});

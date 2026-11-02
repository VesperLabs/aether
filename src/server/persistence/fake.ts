import type { Dice } from "@/content";
import { createServerDice } from "../server-dice";
import { createBaseUser } from "./base-user";
import type { Database, UserDocument } from "./database";

export async function initFakeDatabase(dice: Dice = createServerDice()): Promise<Database> {
  return getDatabaseApi(dice);
}

const getDatabaseApi = (dice: Dice): Database => ({
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
    if (!email) return console.log("❌ Email not provided");
    return { email, ...createBaseUser(dice, "rogue") } as UserDocument;
  },
  getUserByLogin: async ({ email }) => {
    if (!email) return console.log("❌ Email not provided");
    return { email, ...createBaseUser(dice, "rogue") } as UserDocument;
  },
});

import { createBaseUser } from "./base-user";
import type { Database, UserDocument } from "./database";

export async function initFakeDatabase(): Promise<Database> {
  return getDatabaseApi();
}

const getDatabaseApi = (): Database => ({
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
    return { email, ...createBaseUser("rogue") } as UserDocument;
  },
  getUserByLogin: async ({ email }) => {
    if (!email) return console.log("❌ Email not provided");
    return { email, ...createBaseUser("rogue") } as UserDocument;
  },
});

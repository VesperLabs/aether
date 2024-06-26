import { createBaseUser } from "./";

export async function initFakeDatabase() {
  return getDatabaseApi();
}

const getDatabaseApi = () => ({
  getAllUsers: async () => [],
  countAllUsers: async () => {},
  pruneNoobs: async () => {},
  createUser: async () => true,
  updateUser: async () => {},
  updateUserMapDetails: async () => {},
  updateUserSetting: async () => {},
  pruneItemByKey: async () => {},
  updateUsersMaxExp: async () => {},
  getUserByEmail: async ({ email }) => {
    if (!email) return console.log("❌ Email not provided");
    return { email, ...createBaseUser("rogue") };
  },
  getUserByLogin: async ({ email, password = "" }) => {
    if (!email) return console.log("❌ Email not provided");
    return { email, ...createBaseUser("rogue") };
  },
});

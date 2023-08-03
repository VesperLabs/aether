import { createBaseUser } from "./";

export async function initFakeDatabase() {
  return getDatabaseApi();
}

const getDatabaseApi = () => ({
  getUserByEmail: async ({ email }) => {
    if (!email) return console.log("❌ Email not provided");
    return { email, ...createBaseUser("warrior") };
  },
  getUserByLogin: async ({ email, password = "" }) => {
    if (!email) return console.log("❌ Email not provided");
    return { email, ...createBaseUser("warrior") };
  },
  getAllUsers: async () => {},
  createUser: async ({ email, charClass, password }) => {
    if (!email) {
      return console.log("❌ Error while creating player. Email not provided");
    }
    console.log(`💾 Created ${email} to db`);
    return true;
  },
  updateUser: async (player) => {
    if (!player?.email) {
      return console.log("❌ Error while saving player. Player not found");
    }
    console.log(`💾 Saved ${player?.email} to db`);
  },
  updateUserRoom: async (player) => {
    if (!player?.email) {
      return console.log("❌ Error while saving player. Player not found");
    }
    console.log(`💾 Saved ${player?.email} to db`);
  },
});

import type { CharacterState } from "@/rules/character";
import type { createBaseUser } from "./base-user";

/** A user as stored in the `users` collection. */
export type UserDocument = ReturnType<typeof createBaseUser> & {
  email: string;
  password?: string;
  npcKills?: Record<string, number>;
  spawn?: { x: number; y: number; roomName: string };
  _id?: unknown;
  activeItemSlots?: string[];
  updatedAt?: Date;
  state?: CharacterState;
};

/** The parts of a player the database reads when saving. */
export interface SavedPlayer {
  email?: string;
  isDemoAccount?: boolean;
  charClass?: string;
  quests?: unknown;
  profile?: unknown;
  direction?: string;
  gold?: unknown;
  npcKills?: unknown;
  stats?: { hp?: number; mp?: number; sp?: number; exp?: number };
  equipment?: unknown;
  inventory?: unknown;
  baseStats?: unknown;
  abilities?: unknown;
  activeItemSlots?: unknown;
}

/** Where a player is, for saving their position. */
export interface SavedMapDetails {
  email?: string;
  isDemoAccount?: boolean;
  room?: { name?: string } | null;
  roomName?: string | null;
  x?: number;
  y?: number;
  spawn?: { x: number; y: number; roomName: string };
}

export interface Database {
  getUserByEmail(args: { email?: string | null }): Promise<UserDocument | null | void>;
  getUserByLogin(args: {
    email?: string | null;
    password?: string | null;
  }): Promise<UserDocument | null | void>;
  getAllUsers(args: { page?: number; pageSize?: number; sortBy?: string }): Promise<UserDocument[]>;
  countAllUsers(): Promise<number>;
  updateUsersMaxExp(): Promise<void>;
  pruneNoobs(): Promise<void>;
  pruneItemByKey(keyToRemove: string): Promise<void>;
  createUser(args: {
    email?: string | null;
    charClass?: string | null;
    password?: string | null;
  }): Promise<boolean | void>;
  updateUserMapDetails(args: SavedMapDetails): Promise<void>;
  updateUserSetting(
    player: { email?: string; isDemoAccount?: boolean },
    setting: { name: string; value: unknown },
  ): Promise<void>;
  updateUser(player: SavedPlayer): Promise<void>;
}

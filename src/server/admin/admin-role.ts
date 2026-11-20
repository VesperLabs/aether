import type { Player } from "@/server/player";

/** Players logged in on an account with the admin role: they can cheat even when the server has cheats off. */
const admins = new WeakSet<Player>();

export function markAdmin(player: Player) {
  admins.add(player);
}

export function isAdmin(player: Player): boolean {
  return admins.has(player);
}

/** The secret that `/admin <password>` takes, from ADMIN_PASSWORD. Unset turns `/admin` off. */
export function isAdminPassword(password: string | undefined): boolean {
  const secret = process.env.ADMIN_PASSWORD;
  return !!secret && password === secret;
}

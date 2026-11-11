import type { Express } from "express";
import type { LoginCharacter } from "@/network";
import type { Database } from "../persistence/database";

/** Plenty for people typing, even a few behind one address; slows a script guessing emails. */
const MAX_LOOKUPS_PER_WINDOW = 60;
const LOOKUP_WINDOW_MS = 60_000;
const MAX_EMAIL_LENGTH = 254;

/** Counts per key, all forgotten when the window ends, so it never grows past one window. */
export function createLookupLimit(max: number, windowMs: number) {
  let windowStart = 0;
  let counts = new Map<string, number>();
  return (key: string, now: number) => {
    if (now - windowStart >= windowMs) {
      windowStart = now;
      counts = new Map();
    }
    const count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count);
    return count <= max;
  };
}

/** Which character an email belongs to, for the login form. */
export function registerCharacterLookup(app: Express, db: Database, now: () => number) {
  const isAllowed = createLookupLimit(MAX_LOOKUPS_PER_WINDOW, LOOKUP_WINDOW_MS);

  app.get("/players/lookup", async (req, res) => {
    const { email } = req.query;
    /* Must be a string: `?email[$ne]=x` arrives as an object, which Mongo reads as a query */
    if (typeof email !== "string" || !email || email.length > MAX_EMAIL_LENGTH) {
      return res.status(400).end();
    }
    if (!isAllowed(req.ip ?? "", now())) return res.status(429).end();

    /* Accounts are stored lowercase, as `getUserByLogin` expects */
    const user = await db.getUserByEmail({ email: email.toLowerCase() });
    /* Named field by field: the user document also holds the password */
    const character: LoginCharacter | null = user
      ? {
          charClass: user.charClass,
          level: user.baseStats?.level,
          profile: user.profile,
          equipment: user.equipment,
          /* Worked out on first login; until then, show whatever the character wears */
          activeItemSlots:
            user.activeItemSlots ??
            Object.entries(user.equipment ?? {})
              .filter(([, item]) => item)
              .map(([slot]) => slot),
        }
      : null;
    res.json({ character });
  });
}

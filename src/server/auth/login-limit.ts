import { createLookupLimit } from "../http/character-lookup";
import type { Database } from "../persistence/database";

const WINDOW_MS = 60_000;
const MAX_TRIES_PER_ACCOUNT = 10;
/** Higher: players can share an address. */
const MAX_TRIES_PER_ADDRESS = 30;

function createLoginLimit() {
  const isAccountAllowed = createLookupLimit(MAX_TRIES_PER_ACCOUNT, WINDOW_MS);
  const isAddressAllowed = createLookupLimit(MAX_TRIES_PER_ADDRESS, WINDOW_MS);
  return (address: string, email: string, now: number) => {
    const isAddressOk = isAddressAllowed(address, now);
    return isAccountAllowed(email.toLowerCase(), now) && isAddressOk;
  };
}

/* One per database, so socket and HTTP logins spend the same tries */
const LIMITS = new WeakMap<Database, ReturnType<typeof createLoginLimit>>();

/** Counts a login attempt, by account and by address. False once either has had too many. */
export function isLoginAllowed(db: Database, address: string, email: string, now: number) {
  const limit = LIMITS.get(db) ?? createLoginLimit();
  LIMITS.set(db, limit);
  return limit(address, email, now);
}

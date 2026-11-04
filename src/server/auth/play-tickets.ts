import { randomBytes } from "node:crypto";

/** Long enough to load the game. */
const TICKET_LIFETIME_MS = 60_000;

/** Unredeemed tickets. Kept here rather than signed, so each one works exactly once. */
const TICKETS = new Map<string, { email: string; expiresAt: number }>();

/** A one-time pass into the game for an account that has just logged in. */
export function issuePlayTicket(email: string, now: number) {
  for (const [id, ticket] of TICKETS) if (ticket.expiresAt <= now) TICKETS.delete(id);
  const id = randomBytes(32).toString("base64url");
  TICKETS.set(id, { email, expiresAt: now + TICKET_LIFETIME_MS });
  return id;
}

/** The ticket's account, once: redeeming spends it. Null if unknown, spent or expired. */
export function redeemPlayTicket(id: string, now: number) {
  const ticket = TICKETS.get(id);
  TICKETS.delete(id);
  return ticket && ticket.expiresAt > now ? ticket.email : null;
}

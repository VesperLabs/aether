import express, { type Express } from "express";
import { z } from "zod";
import type { Database } from "../persistence/database";
import { logIn, logInWithToken, MAX_PASSWORD_LENGTH, registerAccount } from "../auth/accounts";
import { issuePlayTicket } from "../auth/play-tickets";

/* Must be strings: an object here would reach Mongo as a query */
const email = z.string().min(1).max(254);
const password = z.string().min(1).max(MAX_PASSWORD_LENGTH);
const remember = z.boolean().optional();

const schemas = {
  login: z.object({ email, password, remember }),
  token: z.object({ token: z.string().min(1).max(1024) }),
  register: z.object({
    email,
    password,
    remember,
    charClass: z.string().min(1).max(32),
    gender: z.enum(["male", "female"]).optional(),
  }),
};

const INVALID = { error: "Fill in every field" };

/**
 * The forms on the game and the wiki. A login answers with a one-time ticket instead of entering
 * the world, because only the game has a connection to enter it on.
 */
export function registerAuthRoutes(app: Express, db: Database, now: () => number) {
  const json = express.json({ limit: "2kb" });
  const attempt = (req: express.Request) => ({ db, address: req.ip ?? "", now: now() });

  app.post("/auth/login", json, async (req, res) => {
    const parsed = schemas.login.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(INVALID);
    const result = await logIn(attempt(req), parsed.data);
    if ("error" in result) return res.status(result.status).json({ error: result.error });
    const ticket = issuePlayTicket(result.user.email as string, now());
    res.json({ ticket, token: result.token });
  });

  app.post("/auth/token", json, async (req, res) => {
    const parsed = schemas.token.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(INVALID);
    const result = await logInWithToken(attempt(req), parsed.data.token);
    if ("error" in result) {
      return res.status(result.status).json({ error: result.error, expired: result.expired });
    }
    res.json({ ticket: issuePlayTicket(result.user.email as string, now()) });
  });

  app.post("/auth/register", json, async (req, res) => {
    const parsed = schemas.register.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(INVALID);
    const result = await registerAccount(attempt(req), parsed.data);
    if ("error" in result) return res.status(result.status).json({ error: result.error });
    res.json(result);
  });
}

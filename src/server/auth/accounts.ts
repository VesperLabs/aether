import type { Database, UserDocument } from "../persistence/database";
import { isLoginAllowed } from "./login-limit";
import { createLoginToken, isLoginTokenValid, readLoginTokenEmail } from "./login-token";

const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 256;
export const TOO_MANY_TRIES = "Too many tries, wait a minute";
const LOOKS_LIKE_EMAIL = /^\S+@\S+\.\S+$/;

type Refusal = { error: string; status: number; expired?: boolean };
type Attempt = { db: Database; address: string; now: number };

const rememberToken = (user: UserDocument, now: number) =>
  createLoginToken(user.email as string, user.password ?? "", now);

/** The account behind a password, with a "Remember me" token if asked for. */
export async function logIn(
  { db, address, now }: Attempt,
  { email, password, remember }: { email: string; password: string; remember?: boolean },
): Promise<Refusal | { user: UserDocument; token?: string }> {
  if (!isLoginAllowed(db, address, email, now)) return { error: TOO_MANY_TRIES, status: 429 };
  const user = await db.getUserByLogin({ email, password });
  if (!user) return { error: "Invalid login", status: 401 };
  return { user, token: remember ? rememberToken(user, now) : undefined };
}

/** The account behind a "Remember me" token. */
export async function logInWithToken(
  { db, address, now }: Attempt,
  token: string,
): Promise<Refusal | { user: UserDocument }> {
  const email = readLoginTokenEmail(token) ?? "";
  if (!isLoginAllowed(db, address, email, now)) return { error: TOO_MANY_TRIES, status: 429 };
  const user = await db.getUserByEmail({ email });
  if (!user || !isLoginTokenValid(token, user.password ?? "", now)) {
    return { error: "Login expired, enter your password", status: 401, expired: true };
  }
  return { user };
}

export async function registerAccount(
  { db, address, now }: Attempt,
  args: {
    email: string;
    password: string;
    charClass: string;
    gender?: "male" | "female";
    remember?: boolean;
  },
): Promise<Refusal | { email: string; token?: string }> {
  const { password, remember } = args;
  const email = args.email.toLowerCase();
  if (!isLoginAllowed(db, address, email, now)) return { error: TOO_MANY_TRIES, status: 429 };
  if (!LOOKS_LIKE_EMAIL.test(email)) return { error: "Invalid email format", status: 400 };
  if (await db.getUserByEmail({ email })) return { error: "Email already in use", status: 409 };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password needs ${MIN_PASSWORD_LENGTH}+ characters`, status: 400 };
  }
  if (!(await db.createUser({ ...args, email }))) {
    return { error: "Error creating user", status: 500 };
  }
  const user = remember ? await db.getUserByEmail({ email }) : undefined;
  return { email, token: user ? rememberToken(user, now) : undefined };
}

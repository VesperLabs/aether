import { createBaseUser } from "@/server/persistence/base-user";
import type { ParsedCommand } from "@/network/commands";
import type { CommandContext } from "@/server/net/command-context";
import { enterWorld } from "./enter-world";
import { createLoginToken, isLoginTokenValid, readLoginTokenEmail } from "./login-token";

export async function demoLogin(
  ctx: CommandContext,
  { charClass }: ParsedCommand<"demoLogin"> = {},
) {
  const { world, socket } = ctx;
  if (!world.config.allowDemo) return socket.emit("formError", { error: "Demo mode is off" });
  if (!charClass) return socket.emit("formError", { error: "No class" });

  enterWorld(ctx, createBaseUser(world.dice, charClass), { isDemo: true });
}

export async function login(
  ctx: CommandContext,
  { email, password, remember }: ParsedCommand<"login"> = {},
) {
  const { world, socket } = ctx;
  const user = await world.db.getUserByLogin({ email, password });
  if (!user) return socket.emit("formError", { error: "Invalid login" });
  if (remember) {
    socket.emit("loginToken", {
      token: createLoginToken(
        user.email,
        user.password ?? "",
        world.now(),
        world.config.authSecret,
      ),
    });
  }
  enterWorld(ctx, user);
}

export async function tokenLogin(ctx: CommandContext, { token }: ParsedCommand<"tokenLogin">) {
  const { world, socket } = ctx;
  const user = await world.db.getUserByEmail({ email: readLoginTokenEmail(token) });
  if (
    !user ||
    !isLoginTokenValid(token, user.password ?? "", world.now(), world.config.authSecret)
  ) {
    socket.emit("loginTokenRejected");
    return socket.emit("formError", { error: "Login expired, enter your password" });
  }
  enterWorld(ctx, user);
}

export async function register(
  ctx: CommandContext,
  { email, password, charClass, remember }: ParsedCommand<"register"> = {},
) {
  const { world, socket } = ctx;
  // Validate email format
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(`${email}`)) {
    return socket.emit("formError", { error: "Invalid email format" });
  }

  // Check if email is already in use
  const user = await world.db.getUserByEmail({ email });
  if (user) {
    return socket.emit("formError", { error: "Email already in use" });
  }

  //Validate password strength
  if (password != null && password.length < 4) {
    return socket.emit("formError", {
      error: "Weak password",
    });
  }

  // Create user if email and password are valid
  const isCreated = await world.db.createUser({ email, password, charClass });
  if (!isCreated) {
    return socket.emit("formError", { error: "Error creating user" });
  }

  // Remember the new account, so the login form is filled in
  if (remember && email) {
    const token = createLoginToken(
      email.toLowerCase(),
      password ?? "",
      world.now(),
      world.config.authSecret,
    );
    socket.emit("loginToken", { token });
  }

  // Send success message
  socket.emit("formSuccess", { success: "Account created", email: email ?? undefined });
}

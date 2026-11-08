import { commands, type CommandName, type GameSocket, type ParsedCommand } from "@/network";
import type { CommandContext } from "./command-context";

type CommandHandler<K extends CommandName> = (
  ctx: CommandContext,
  payload: ParsedCommand<K>,
) => unknown;

/** One handler for every command in `network/commands.ts`. Adding a command adds a key here. */
export type CommandHandlers = { [K in CommandName]: CommandHandler<K> };

function debugLog(...args: unknown[]) {
  if (process.env.DEBUG === "true") console.debug("[net]", ...args);
}

/**
 * Listens for every command on a socket. A payload is checked against the command's zod schema
 * and handed to the handler; a payload that does not match is dropped. A handler that throws
 * only costs the sender that one command, not the whole server.
 */
export function registerCommands(
  socket: GameSocket,
  ctx: CommandContext,
  handlers: CommandHandlers,
) {
  const names = Object.keys(commands) as CommandName[];

  for (const name of names) {
    const schema = commands[name];
    const handler = handlers[name] as CommandHandler<CommandName>;

    // The payload is untrusted until the schema parses it, so the listener takes `unknown`.
    const listen = socket.on.bind(socket) as (
      event: CommandName,
      listener: (payload: unknown) => void,
    ) => unknown;
    listen(name, (payload) => {
      const parsed = schema.safeParse(payload);
      if (!parsed.success) {
        debugLog(`dropped invalid "${name}" from ${ctx.socketId}:`, parsed.error.message);
        return;
      }
      const onError = (error: unknown) => console.error(`❌ "${name}" handler failed`, error);
      try {
        const result = handler(ctx, parsed.data as ParsedCommand<CommandName>);
        if (result instanceof Promise) result.catch(onError);
      } catch (error) {
        onError(error);
      }
    });
  }
}

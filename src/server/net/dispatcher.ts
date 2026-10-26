import { commands, type CommandName, type ParsedCommand } from "@/shared/network";
import type { CommandContext } from "./command-context";

export type CommandHandler<K extends CommandName> = (
  ctx: CommandContext,
  payload: ParsedCommand<K>,
) => unknown;

/** One handler for every command in `shared/network/commands.ts`. Adding a command adds a key here. */
export type CommandHandlers = { [K in CommandName]: CommandHandler<K> };

function debugLog(...args: unknown[]) {
  if (process.env.DEBUG === "true") console.debug("[net]", ...args);
}

/**
 * Listens for every command on a socket. A payload is checked against the command's zod schema
 * and handed to the handler; a payload that does not match is dropped. A handler that throws
 * only costs the sender that one command, not the whole server.
 */
export function registerCommands(ctx: CommandContext, handlers: CommandHandlers) {
  const { socket } = ctx;
  const names = Object.keys(commands) as CommandName[];

  for (const name of names) {
    const schema = commands[name];
    const handler = handlers[name] as CommandHandler<CommandName>;

    // oxlint-disable-next-line typescript/no-explicit-any
    (socket as any).on(name, (...args: unknown[]) => {
      const parsed = schema.safeParse(args[0]);
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

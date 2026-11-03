/** Where the server writes what it did and what went wrong. */
export interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

type LogLevel = "debug" | "info" | "warn" | "error";

/** Writes to the console. `debug` lines are dropped unless `debug` is true. */
export function createConsoleLogger({ debug }: { debug: boolean }): Logger {
  return {
    debug: (...args) => {
      if (debug) console.debug(...args);
    },
    info: (...args) => console.log(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
  };
}

interface LogEntry {
  level: LogLevel;
  args: unknown[];
}

/** A logger that only remembers, so tests can assert on what the server logged. */
export interface MemoryLogger extends Logger {
  entries: LogEntry[];
  /** Entries at one level, or all of them. */
  at(level?: LogLevel): LogEntry[];
}

export function createMemoryLogger(): MemoryLogger {
  const entries: LogEntry[] = [];
  const record =
    (level: LogLevel) =>
    (...args: unknown[]) => {
      entries.push({ level, args });
    };
  return {
    entries,
    at: (level) => (level ? entries.filter((e) => e.level === level) : [...entries]),
    debug: record("debug"),
    info: record("info"),
    warn: record("warn"),
    error: record("error"),
  };
}

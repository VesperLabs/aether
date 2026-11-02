import type { BotLink } from "@/bots";
import type { GameIo } from "@/network";

type Listener = (...args: unknown[]) => void;

/** Listeners by event name, like a socket's. */
function createListeners() {
  const byEvent = new Map<string, Set<Listener>>();
  return {
    on(event: string, listener: Listener) {
      if (!byEvent.has(event)) byEvent.set(event, new Set());
      byEvent.get(event)!.add(listener);
    },
    off(event: string, listener: Listener) {
      byEvent.get(event)?.delete(listener);
    },
    fire(event: string, args: unknown[]) {
      for (const listener of [...(byEvent.get(event) ?? [])]) listener(...args);
    },
  };
}

type Listeners = ReturnType<typeof createListeners>;

/**
 * Copies a value the way the wire would: the receiver gets its own data, never a live object
 * that the sender changes later. Callbacks (acks) pass through.
 */
function overTheWire(args: unknown[]): unknown[] {
  return args.map((arg) => {
    if (arg === undefined || typeof arg === "function") return arg;
    try {
      return structuredClone(arg);
    } catch {
      return JSON.parse(JSON.stringify(arg)); // like socket.io, drops what can't be sent
    }
  });
}

/**
 * socket.io without the network: the server side looks like a socket.io server (`to`, `emit`,
 * rooms, `connection`), each client side is an BotLink. Nothing is delivered until `deliver`,
 * so a simulation decides exactly when messages arrive, in the order they were sent.
 */
export function createLocalHub() {
  const queue: (() => void)[] = [];
  const rooms = new Map<string, Set<string>>();
  const sockets = new Map<string, ServerSocket>();
  const clients = new Map<string, Listeners>();
  const ioListeners = createListeners();
  let nextId = 0;

  /** Queues a message for the clients in `room` (a socket id is also a room), minus `except`. */
  function queueEmit(room: string | null, event: string, args: unknown[], except?: string) {
    const ids = room === null ? [...sockets.keys()] : [...(rooms.get(room) ?? [])];
    for (const id of ids) {
      if (id === except) continue;
      const copied = overTheWire(args);
      queue.push(() => clients.get(id)?.fire(event, copied));
    }
  }

  function join(id: string, room: string) {
    if (!rooms.has(room)) rooms.set(room, new Set());
    rooms.get(room)!.add(id);
  }

  function leave(id: string, room: string) {
    rooms.get(room)?.delete(id);
    if (rooms.get(room)?.size === 0) rooms.delete(room);
  }

  type ServerSocket = ReturnType<typeof serverSocket>;

  /** The server's view of one connection. */
  function serverSocket(id: string) {
    const listeners = createListeners();
    return {
      id,
      listeners,
      on: listeners.on,
      off: listeners.off,
      emit: (event: string, ...args: unknown[]) => queueEmit(id, event, args),
      to: (room: string) => ({
        emit: (event: string, ...args: unknown[]) => queueEmit(room, event, args, id),
      }),
      join: (room: string) => join(id, room),
      leave: (room: string) => leave(id, room),
      disconnect: () => queue.push(() => drop(id)),
    };
  }

  function drop(id: string) {
    const socket = sockets.get(id);
    if (!socket) return;
    socket.listeners.fire("disconnect", []);
    sockets.delete(id);
    clients.delete(id);
    for (const room of [...rooms.keys()]) leave(id, room);
  }

  const io = {
    on: ioListeners.on,
    to: (room: string) => ({
      emit: (event: string, ...args: unknown[]) => queueEmit(room, event, args),
    }),
    emit: (event: string, ...args: unknown[]) => queueEmit(null, event, args),
    sockets: { sockets, adapter: { rooms } },
    close: () => [...sockets.keys()].forEach(drop),
  };

  return {
    /* Only the parts of a socket.io server the game uses */
    io: io as unknown as GameIo,
    /** Opens a connection, as a browser would, and returns the client end. */
    connect(): BotLink {
      const id = `local-${nextId++}`;
      const socket = serverSocket(id);
      const client = createListeners();
      sockets.set(id, socket);
      clients.set(id, client);
      join(id, id);
      ioListeners.fire("connection", [socket]);
      return {
        id,
        send: (command, ...args) => {
          /* An ack the server calls is a message back, so it waits in the queue too */
          const acked = overTheWire(args).map((arg) =>
            typeof arg === "function"
              ? (...reply: unknown[]) => queue.push(() => (arg as Listener)(...overTheWire(reply)))
              : arg,
          );
          queue.push(() => socket.listeners.fire(command, acked));
        },
        on: (message, listener) => {
          client.on(message, listener as Listener);
          return () => client.off(message, listener as Listener);
        },
        close: () => queue.push(() => drop(id)),
      };
    },
    /** Delivers every queued message, including any they cause. Returns whether there were any. */
    deliver(): boolean {
      if (queue.length === 0) return false;
      while (queue.length) queue.shift()!();
      return true;
    },
  };
}

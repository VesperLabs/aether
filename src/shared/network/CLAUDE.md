# shared/network

Messages between client and server. See "`shared/network/`" in `/ARCHITECTURE.md`.

- Strict TypeScript. May import types from `shared/rules/`; `rules/` never imports this folder.
- Every client to server command is one zod schema in `commands.ts`; its type is inferred from the schema. Never write the same shape twice.
- Server to client messages go in `messages.ts`. Snapshots, deltas and wire packing go in `sync/`.
- Never add a raw `socket.on` handler; a command is a schema plus a handler in the feature's `commands.ts`.

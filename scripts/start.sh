#!/bin/sh
# Container entry: seeds bot accounts, then runs the server and the ambient bot runner side by side.
# SIGINT/SIGTERM go to both, so the server's graceful close (saving players) still runs.
#   AMBIENT_BOTS (default 3, 0 disables), BOT_PASSWORD (required in production when bots are on)
set -u
NODE_ARGS="--env-file-if-exists=.env --optimize-for-size"
BOTS="${AMBIENT_BOTS:-3}"
BOTS_PID=""

if [ "$BOTS" != "0" ]; then
  if [ "${NODE_ENV:-}" = "production" ] && [ -z "${BOT_PASSWORD:-}" ]; then
    echo "BOT_PASSWORD must be set when AMBIENT_BOTS > 0 (fly secrets set BOT_PASSWORD=...)" >&2
    exit 1
  fi
  if [ -n "${MONGO_URL:-}" ]; then
    node $NODE_ARGS dist/seed-bots.cjs "$BOTS" --quiet || exit 1
  fi
fi

node $NODE_ARGS --max-old-space-size=512 dist/server.cjs &
SERVER_PID=$!
if [ "$BOTS" != "0" ]; then
  node $NODE_ARGS --max-old-space-size=96 dist/ambient-bots.cjs &
  BOTS_PID=$!
fi

stop() {
  [ -n "$BOTS_PID" ] && kill -INT "$BOTS_PID" 2>/dev/null
  kill -INT "$SERVER_PID" 2>/dev/null
}
trap stop INT TERM

# `wait` returns early when a trapped signal arrives, so wait until the server is really gone.
STATUS=0
while kill -0 "$SERVER_PID" 2>/dev/null; do
  wait "$SERVER_PID"
  STATUS=$?
done
[ -n "$BOTS_PID" ] && kill -INT "$BOTS_PID" 2>/dev/null
exit "$STATUS"

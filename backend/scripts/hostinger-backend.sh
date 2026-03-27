#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
NODE_ROOT="/opt/alt/alt-nodejs20/root/usr/bin"
NODE_BIN="$NODE_ROOT/node"
TS_BIN="$APP_DIR/node_modules/.bin/tsc"
ENTRYPOINT="$APP_DIR/dist/server.js"
RUNTIME_DIR="$APP_DIR/.runtime"
PID_FILE="$RUNTIME_DIR/songkart-api.pid"
LOG_FILE="$RUNTIME_DIR/songkart-api.log"
PORT_VALUE="${PORT:-5001}"
HEALTH_URL="http://127.0.0.1:${PORT_VALUE}/api/health"

mkdir -p "$RUNTIME_DIR"

is_running() {
  if [[ ! -f "$PID_FILE" ]]; then
    return 1
  fi

  local pid
  pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -z "$pid" ]]; then
    return 1
  fi

  kill -0 "$pid" 2>/dev/null
}

is_healthy() {
  is_running && curl --silent --show-error --fail --max-time 5 "$HEALTH_URL" >/dev/null 2>&1
}

build() {
  if [[ ! -x "$TS_BIN" ]]; then
    echo "TypeScript compiler not found at $TS_BIN" >&2
    return 1
  fi

  (
    cd "$APP_DIR"
    export PATH="$NODE_ROOT:$PATH"
    "$TS_BIN" -p tsconfig.json
  )
}

start() {
  if is_healthy; then
    echo "SongKart backend is already healthy (pid $(cat "$PID_FILE"))."
    return 0
  fi

  if is_running; then
    echo "SongKart backend is running but unhealthy; restarting first."
    stop
  fi

  if [[ ! -f "$ENTRYPOINT" ]]; then
    echo "Missing $ENTRYPOINT. Run '$0 build' first." >&2
    return 1
  fi

  (
    cd "$APP_DIR"
    export PATH="$NODE_ROOT:$PATH"
    export PORT="$PORT_VALUE"
    nohup "$NODE_BIN" "$ENTRYPOINT" >>"$LOG_FILE" 2>&1 < /dev/null &
    echo $! > "$PID_FILE"
  )

  for _ in $(seq 1 10); do
    if is_healthy; then
      echo "SongKart backend started on port $PORT_VALUE (pid $(cat "$PID_FILE"))."
      return 0
    fi
    sleep 1
  done

  echo "SongKart backend failed to become healthy. Check $LOG_FILE." >&2
  stop || true
  return 1
}

stop() {
  if ! is_running; then
    rm -f "$PID_FILE"
    echo "SongKart backend is not running."
    return 0
  fi

  local pid
  pid="$(cat "$PID_FILE")"
  kill "$pid" 2>/dev/null || true

  for _ in $(seq 1 10); do
    if ! kill -0 "$pid" 2>/dev/null; then
      rm -f "$PID_FILE"
      echo "SongKart backend stopped."
      return 0
    fi
    sleep 1
  done

  kill -9 "$pid" 2>/dev/null || true
  rm -f "$PID_FILE"
  echo "SongKart backend force-stopped."
}

status() {
  if is_healthy; then
    echo "SongKart backend is healthy (pid $(cat "$PID_FILE"))."
    return 0
  fi

  if is_running; then
    echo "SongKart backend is running but unhealthy (pid $(cat "$PID_FILE"))."
    return 1
  fi

  echo "SongKart backend is stopped."
  return 1
}

ensure() {
  if is_healthy; then
    echo "SongKart backend already healthy (pid $(cat "$PID_FILE"))."
    return 0
  fi

  if is_running; then
    echo "SongKart backend is unhealthy; restarting."
    stop || true
  fi

  start
}

logs() {
  tail -n 100 "$LOG_FILE"
}

case "${1:-}" in
  build)
    build
    ;;
  start)
    start
    ;;
  stop)
    stop
    ;;
  restart)
    stop || true
    start
    ;;
  ensure)
    ensure
    ;;
  status)
    status
    ;;
  logs)
    logs
    ;;
  *)
    echo "Usage: $0 {build|start|stop|restart|ensure|status|logs}" >&2
    exit 1
    ;;
esac

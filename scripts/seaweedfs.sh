#!/usr/bin/env bash
set -e

DATA_DIR="${HOME}/seaweedfs/data"
LOG_FILE="${HOME}/seaweedfs/seaweedfs.log"
PID_FILE="${HOME}/seaweedfs/seaweedfs.pid"

WEED_BIN="$(command -v weed || echo "/opt/homebrew/bin/weed")"

if [ ! -x "$WEED_BIN" ]; then
  echo "Error: 'weed' binary not found. Please install SeaweedFS (e.g. 'brew install seaweedfs')."
  exit 1
fi

mkdir -p "$DATA_DIR"

is_running() {
  if [ -f "$PID_FILE" ]; then
    PID="$(cat "$PID_FILE")"
    if ps -p "$PID" > /dev/null 2>&1 && ps -p "$PID" -o command | grep -q "weed"; then
      return 0
    fi
  fi
  # Fallback check for any active weed mini/server process
  pgrep -f "weed (mini|server)" > /dev/null 2>&1
}

start() {
  if is_running; then
    echo "SeaweedFS is already running."
    status
    return 0
  fi

  echo "Starting SeaweedFS (mini mode with S3, Filer, Master & Volume)..."
  nohup "$WEED_BIN" mini \
    -dir="$DATA_DIR" \
    -ip=localhost \
    -bucket=aquainsure-media,aquainsure \
    >> "$LOG_FILE" 2>&1 &

  PID=$!
  echo "$PID" > "$PID_FILE"

  echo "Waiting for SeaweedFS to initialize..."
  for i in {1..15}; do
    if curl -s "http://localhost:9333/dir/status" > /dev/null 2>&1; then
      echo "SeaweedFS started successfully! (PID: $PID)"
      echo "  - Master UI:     http://localhost:9333"
      echo "  - Volume Server: http://localhost:9340"
      echo "  - Filer UI:      http://localhost:8888"
      echo "  - S3 Endpoint:   http://localhost:8333"
      echo "  - Admin UI:      http://localhost:23646"
      echo "  - Data Dir:      $DATA_DIR"
      echo "  - Logs:          $LOG_FILE"
      return 0
    fi
    sleep 1
  done

  echo "Warning: SeaweedFS started but master endpoint did not respond within 15s. Check logs at: $LOG_FILE"
}

stop() {
  echo "Stopping SeaweedFS..."
  STOPPED=false

  if [ -f "$PID_FILE" ]; then
    PID="$(cat "$PID_FILE")"
    if ps -p "$PID" > /dev/null 2>&1; then
      kill "$PID" 2>/dev/null || true
      rm -f "$PID_FILE"
      STOPPED=true
    fi
  fi

  # Stop any remaining weed processes
  pkill -f "weed (mini|server|master|volume|filer|s3)" 2>/dev/null || true

  rm -f "$PID_FILE"
  echo "SeaweedFS stopped."
}

status() {
  echo "Checking SeaweedFS status..."
  if curl -s "http://localhost:9333/dir/status" > /dev/null 2>&1; then
    echo "  [✓] Master (9333):   RUNNING"
  else
    echo "  [✗] Master (9333):   STOPPED"
  fi

  if curl -s -I "http://localhost:8888/" > /dev/null 2>&1; then
    echo "  [✓] Filer (8888):    RUNNING"
  else
    echo "  [✗] Filer (8888):    STOPPED"
  fi

  if curl -s -I "http://localhost:8333/" > /dev/null 2>&1; then
    echo "  [✓] S3 Gateway (8333): RUNNING"
  else
    echo "  [✗] S3 Gateway (8333): STOPPED"
  fi

  echo ""
  echo "Cluster Details:"
  curl -s "http://localhost:9333/dir/status?pretty=y" 2>/dev/null || echo "Unable to connect to master."
}

case "$1" in
  start)
    start
    ;;
  stop)
    stop
    ;;
  restart)
    stop
    sleep 2
    start
    ;;
  status)
    status
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac

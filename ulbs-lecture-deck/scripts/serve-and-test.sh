#!/usr/bin/env bash
# Build a project, serve it on a free temporary port, run the headless test, stop the server.
# usage: serve-and-test.sh <project_dir> [--interact]
# Run it from a folder where playwright is installed, or set PLAYWRIGHT_PATH / CHROME_PATH (see test-deck.js).
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"; SKILL="$(dirname "$HERE")"
PROJ="$(cd "$1" && pwd)"; shift
OUT="$PROJ/out.html"
python3 -I "$SKILL/framework/build.py" "$PROJ" "$OUT" || exit 1
PORT="$(python3 -I -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1])')"
(cd "$PROJ" && exec python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1) &
SERVER=$!
trap 'kill "$SERVER" 2>/dev/null' EXIT
sleep 1
node "$HERE/test-deck.js" "http://127.0.0.1:$PORT/out.html" "$PROJ/shots" "$@"

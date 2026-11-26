#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$PROJECT_DIR/dist"
PORT="${PORT:-3000}"
OPENCODE_WEB_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"
DEPLOYMENT_DIR="/home/runner/work/_temp/omgithub-web"

run() {
  /usr/bin/time -p "$@"
}

cd "$PROJECT_DIR"
run mkdir -p "$OPENCODE_WEB_DIR" "$DEPLOYMENT_DIR"

if [[ -f "$PROJECT_DIR/package.json" ]]; then
  run npm install
  if node -e "process.exit(require('./package.json').scripts?.build ? 0 : 1)"; then
    run npm run build
  fi
fi

# This game is a dependency-free static app; stage its source as the built site.
run rm -rf "$DIST_DIR"
run mkdir -p "$DIST_DIR"
run cp -R "$PROJECT_DIR/app/." "$DIST_DIR/"
run test -s "$DIST_DIR/index.html"
run node -e 'const fs=require("node:fs"); const p=process.argv[1]; const d=process.argv[2]; fs.writeFileSync(p, JSON.stringify({project:d,directory:d+"/dist"}, null, 2)+"\n")' "$DEPLOYMENT_DIR/deployment-output.json" "$PROJECT_DIR"

# Keep the server in the foreground for the controller-owned tmux app-server.
run python3 -m http.server --bind 0.0.0.0 "$PORT" --directory "$DIST_DIR"

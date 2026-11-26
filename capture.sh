#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
: "${CAPTURE_URL:?Set CAPTURE_URL to the exact preview URL}"
: "${CAPTURE_DIR:?Set CAPTURE_DIR to the evidence output directory}"

run() {
  /usr/bin/time -p "$@"
}

run mkdir -p "$CAPTURE_DIR"
# The runtime capture helper owns and closes its isolated browser, waits for
# rendered game content, and assigns exit 75 to transient browser/navigation failures.
run env CAPTURE_URL="$CAPTURE_URL" CAPTURE_DIR="$CAPTURE_DIR" CAPTURE_READY_SELECTOR='canvas#game' CAPTURE_STRICT=1 node "${RUNTIME_DIR:?}/scripts/default-capture.mjs"
run test -s "$CAPTURE_DIR/final-desktop.png"
run test -s "$CAPTURE_DIR/final-mobile.png"

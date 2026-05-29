#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

case "${1:-}" in
  --help|-h)
    cat <<'EOF'
Usage:
  scripts/test-app.sh            Start the Docker frontend preview
  scripts/test-app.sh --quality  Run quality gates and Docker desktop tests
EOF
    exit 0
    ;;
  ""|--quality|quality)
    ;;
  *)
    echo "Unknown option: $1" >&2
    echo "Run scripts/test-app.sh --help for usage." >&2
    exit 1
    ;;
esac

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "$1 is required on PATH." >&2
    exit 1
  fi
}

require_command npm
require_command python
require_command docker

echo "Installing project dependencies..."
npm ci
python -m pip install -e "workers/python[dev]"

case "${1:-}" in
  --quality|quality)
    echo "Running quality gates..."
    npm run quality
    npm run docker:desktop:test
    npm audit --audit-level=high
    ;;
  "")
    echo "Starting AgenticCrew frontend at http://localhost:5173"
    npm run docker:frontend
    ;;
esac

#!/usr/bin/env bash
# Pulls the two models this project uses onto a running Ollama server.
# Run this once after Ollama is up (model weights persist in a volume /
# on disk after that — no need to re-pull on every restart).
#
# Usage:
#   Local docker-compose service:  ./scripts/pull-models.sh
#   Remote cloud GPU instance:     OLLAMA_HOST=http://<instance-ip>:11434 ./scripts/pull-models.sh
set -euo pipefail

TEXT_MODEL="${OLLAMA_TEXT_MODEL:-qwen3:4b}"
VISION_MODEL="${OLLAMA_VISION_MODEL:-qwen2.5vl:7b}"

if [ -n "${OLLAMA_HOST:-}" ]; then
  echo "Pulling models on remote Ollama at $OLLAMA_HOST ..."
  echo "(requires the 'ollama' CLI installed locally: https://ollama.com/download)"
  ollama pull "$TEXT_MODEL"
  ollama pull "$VISION_MODEL"
else
  echo "Pulling models on the local docker-compose 'ollama' service ..."
  docker compose exec ollama ollama pull "$TEXT_MODEL"
  docker compose exec ollama ollama pull "$VISION_MODEL"
fi

echo ""
echo "Done. Verify with:"
if [ -n "${OLLAMA_HOST:-}" ]; then
  echo "  ollama list"
else
  echo "  docker compose exec ollama ollama list"
fi

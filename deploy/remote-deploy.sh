#!/bin/bash
set -euo pipefail
log() { echo "[$(date '+%H:%M:%S')] $*"; }

log "=== SuperMessenger deploy ==="
log "[1/5] Extract to __REMOTE_DIR__"
mkdir -p __REMOTE_DIR__
cd __REMOTE_DIR__
# tar does not remove files absent from the archive; wipe deploy artifacts first
rm -rf src Dockerfile docker-compose.yml
tar -xzf /tmp/__ARCHIVE_NAME__

log "[2/5] Environment"
export APP_PORT=__APP_PORT__
export ADMIN_LOGIN=__ADMIN_LOGIN__
export ADMIN_PASSWORD=__ADMIN_PASSWORD__
export PUBLIC_URL='__PUBLIC_URL__'
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

if ! command -v docker >/dev/null 2>&1; then
  log "ERROR: docker not installed on server"
  exit 1
fi
docker --version
docker compose version 2>/dev/null || docker-compose --version

log "[3/5] Stop old containers"
docker compose down 2>/dev/null || true

log "[4/5] Docker BUILD (first run: 5-20 min - live output below)"
docker compose build --progress=plain

log "[5/5] Start containers"
docker compose up -d
docker compose ps
curl -sf -o /dev/null -w "HTTP %{http_code} login.html\n" http://127.0.0.1:__APP_PORT__/login.html || true

if [ -n '__PUBLIC_URL__' ]; then
  log "=== Done: __PUBLIC_URL__ (app on 127.0.0.1:__APP_PORT__) ==="
else
  log "=== Done: http://__SERVER_HOST__:__APP_PORT__ ==="
fi

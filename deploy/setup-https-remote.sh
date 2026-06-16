#!/bin/bash
set -euo pipefail
log() { echo "[$(date '+%H:%M:%S')] $*"; }

# Домен: первый аргумент или SM_DEPLOY_DOMAIN (без https://)
DOMAIN="${1:-${SM_DEPLOY_DOMAIN:-}}"
if [ -z "$DOMAIN" ]; then
  echo "Usage: $0 <domain>" >&2
  echo "  or set SM_DEPLOY_DOMAIN=messenger.example.com" >&2
  exit 1
fi
DOMAIN="${DOMAIN#https://}"
DOMAIN="${DOMAIN#http://}"
DOMAIN="${DOMAIN%%/*}"

APP_DIR='/opt/supermessenger'
NGINX_SITE='/etc/nginx/sites-available/supermessenger.conf'

log "=== HTTPS setup for $DOMAIN ==="

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx certbot

mkdir -p /var/www/certbot
mkdir -p /tmp/deploy-nginx

log "SuperMessenger: bind app to localhost:8080"
cd "$APP_DIR"
if ! grep -q '127.0.0.1:8080:80' docker-compose.yml; then
  sed -i 's|- "${APP_PORT:-80}:80"|- "127.0.0.1:8080:80"|' docker-compose.yml
fi
export PUBLIC_URL="https://${DOMAIN}"
export ADMIN_LOGIN="${ADMIN_LOGIN:-admin}"
export ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
docker compose up -d --force-recreate
sleep 3
curl -sf -o /dev/null -w "app HTTP %{http_code}\n" http://127.0.0.1:8080/login.html

log "nginx: HTTP (ACME + proxy)"
cat > "$NGINX_SITE" <<NGINX_HTTP
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX_HTTP
ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/supermessenger.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl restart nginx

log "Let's Encrypt certificate"
certbot certonly --webroot -w /var/www/certbot \
  -d "$DOMAIN" \
  --non-interactive --agree-tos --register-unsafely-without-email \
  --preferred-challenges http

if [ ! -f /etc/letsencrypt/options-ssl-nginx.conf ]; then
  curl -sS https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf \
    -o /etc/letsencrypt/options-ssl-nginx.conf
  openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048
fi

log "nginx: HTTPS"
if [ -f /tmp/deploy-nginx/supermessenger.conf ]; then
  sed "s/YOUR_DOMAIN/${DOMAIN}/g" /tmp/deploy-nginx/supermessenger.conf > "$NGINX_SITE"
else
  log "WARN: /tmp/deploy-nginx/supermessenger.conf not found — оставляем HTTP-конфиг"
fi
nginx -t
systemctl reload nginx

log "certbot renew hook"
mkdir -p /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh <<'HOOK'
#!/bin/bash
systemctl reload nginx
HOOK
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

log "verify"
curl -sf -o /dev/null -w "HTTPS %{http_code}\n" "https://${DOMAIN}/login.html"
curl -sfI "https://${DOMAIN}/login.html" | head -6

log "=== Done: https://${DOMAIN}/ ==="

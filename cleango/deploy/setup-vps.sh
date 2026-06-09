#!/bin/bash
set -e

# CleanGo VPS Provisioning Script
# Tested on Ubuntu 22.04 LTS
# Run as root: bash setup-vps.sh

echo "==> Installing Docker..."
apt-get update
apt-get install -y ca-certificates curl gnupg

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "==> Creating app directory..."
mkdir -p /opt/cleango
cd /opt/cleango

echo "==> Installing Certbot..."
apt-get install -y certbot python3-certbot-nginx

echo ""
echo "VPS setup complete. Next steps:"
echo "1. Copy docker-compose.yml and nginx/nginx.conf to /opt/cleango"
echo "2. Create .env files from .env.production.example:"
echo "   cp packages/backend/.env.production.example packages/backend/.env"
echo "   cp packages/admin-dashboard/.env.production.example packages/admin-dashboard/.env.local"
echo "   (then fill in real values)"
echo "3. Run: certbot --nginx -d api.cleango.ng -d admin.cleango.ng"
echo "4. Run: docker compose up -d"

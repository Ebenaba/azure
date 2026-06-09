# CleanGo Deployment Guide

## Prerequisites

- Ubuntu 22.04 VPS (minimum 2 vCPU / 2 GB RAM recommended)
- Domain names pointed to your VPS IP:
  - `api.cleango.ng` → VPS IP
  - `admin.cleango.ng` → VPS IP
- Firebase project created at [console.firebase.google.com](https://console.firebase.google.com)
- GitHub repository with Actions enabled

---

## 1. First-Time VPS Setup

SSH into your VPS as root and run the provisioning script:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/your-org/cleango/main/deploy/setup-vps.sh)
```

Or copy the script manually and run:

```bash
bash deploy/setup-vps.sh
```

---

## 2. SSL Certificate Setup

Once DNS is propagated and Docker/Nginx are installed:

```bash
certbot --nginx -d api.cleango.ng -d admin.cleango.ng
```

Certbot will write certificates to `/etc/letsencrypt/live/` and auto-renew via systemd timer.

---

## 3. Environment Variable Configuration

On the VPS, inside `/opt/cleango`:

```bash
cp packages/backend/.env.production.example packages/backend/.env
cp packages/admin-dashboard/.env.production.example packages/admin-dashboard/.env.local
```

Edit both files and replace all `your_xxx_here` placeholders with real values. Never commit these files — they are `.gitignore`d.

---

## 4. GitHub Actions Secrets

In your GitHub repo → Settings → Secrets and variables → Actions, add:

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | IP address or hostname of the production VPS |
| `VPS_USER` | SSH user on the VPS (e.g. `root` or `deploy`) |
| `VPS_SSH_KEY` | Private SSH key with access to the VPS |
| `FIREBASE_TOKEN` | Firebase CI token (`firebase login:ci`) |

`GITHUB_TOKEN` is provided automatically by Actions for GHCR image pushes.

---

## 5. Manual Deploy

To deploy without pushing to `main`:

```bash
# On your local machine — build and push images
docker buildx build --push \
  -t ghcr.io/your-org/cleango/cleango-backend:latest \
  packages/backend

docker buildx build --push \
  -t ghcr.io/your-org/cleango/cleango-admin:latest \
  packages/admin-dashboard

# On the VPS
cd /opt/cleango
docker compose pull
docker compose up -d --no-build
```

---

## 6. Monitoring

```bash
# View live logs
docker logs -f cleango-backend-1
docker logs -f cleango-admin-dashboard-1

# Resource usage
docker stats

# Check health
curl https://api.cleango.ng/health
```

---

## 7. Rollback Procedure

Each deployment tags images with the Git SHA (e.g. `ghcr.io/.../cleango-backend:abc1234`).

To roll back to a previous version:

1. Update `docker-compose.yml` on the VPS to pin the image tag:
   ```yaml
   backend:
     image: ghcr.io/your-org/cleango/cleango-backend:abc1234
   ```
2. Run:
   ```bash
   docker compose up -d --no-build
   ```
3. Verify the service is healthy, then revert the image tag change.

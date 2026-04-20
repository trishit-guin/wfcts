# WFCTS Deployment Guide

## Architecture

```
GitHub push (main)
    │
    ├── frontend/ changes → Vercel auto-deploys → https://wfcts.vercel.app
    │
    └── backend/ changes  → GitHub Actions
                              → Docker build (with GHA layer cache)
                              → Push image to Amazon ECR
                              → SSH to EC2: docker pull + restart
                              → Health check /api/health
```

Vercel proxies `/api/*` requests to the EC2 backend server-side, avoiding mixed-content issues without needing a domain or SSL on EC2.

---

## Frontend — Vercel

### Initial setup (one-time)
1. Connect the GitHub repo to [vercel.com](https://vercel.com)
2. Set **Root Directory** to `wfcts/frontend` in Vercel project settings
3. Remove `VITE_API_URL` environment variable (leave unset — Vercel rewrites handle routing)

### How deploys work
Every push to `main` that touches `frontend/` auto-deploys via Vercel. No manual steps.

### vercel.json
`frontend/vercel.json` handles two things:
- Rewrites `/api/:path*` → `http://<EC2_IP>:3000/api/:path*` (server-side proxy)
- Rewrites all other routes → `index.html` (React Router SPA support)

---

## Backend — Docker + ECR + EC2

### GitHub Actions secrets required

| Secret | Example |
|--------|---------|
| `AWS_ACCESS_KEY_ID` | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | `wJalr...` |
| `AWS_REGION` | `us-east-1` |
| `ECR_REGISTRY` | `123456789012.dkr.ecr.us-east-1.amazonaws.com` |
| `EC2_HOST` | `43.205.216.124` |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | contents of `.pem` key file |

### EC2 one-time setup

```bash
# Install Docker
sudo apt update && sudo apt install -y docker.io
sudo usermod -aG docker ubuntu
newgrp docker

# Install AWS CLI
sudo apt install -y awscli

# Create env file
mkdir -p ~/app
nano ~/app/.env   # fill in production values (see backend/.env.example)

# Create named volume for uploads
docker volume create wfcts-uploads
```

### EC2 security group ports

| Port | Source | Purpose |
|------|--------|---------|
| 22 | Your IP only | SSH (GitHub Actions deploys) |
| 3000 | 0.0.0.0/0 | Backend API (called by Vercel proxy) |

### IAM permissions for EC2
Attach an IAM role to the EC2 instance with:
- `ecr:GetAuthorizationToken`
- `ecr:BatchGetImage`
- `ecr:GetDownloadUrlForLayer`

Or set `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` directly in `~/app/.env`.

### How deploys work
Every push to `main` that touches `backend/` triggers `.github/workflows/deploy.yml`:
1. Builds Docker image on GitHub's runner (uses layer cache — fast if `package.json` unchanged)
2. Pushes to ECR tagged with `git SHA` + `latest`
3. SSHs into EC2, pulls new image, stops old container, starts new one
4. Health-checks `GET /api/health` with retries — rolls back on failure
5. Prunes images older than 72h

### Rollback
Every deploy is tagged with its `git SHA` in ECR. To roll back:
```bash
docker stop wfcts-backend
docker run -d --name wfcts-backend --restart always \
  -p 3000:3000 --env-file ~/app/.env -v wfcts-uploads:/app/public/uploads \
  <ECR_REGISTRY>/wfcts-backend:<previous-sha>
```

---

## MongoDB Atlas

- Whitelist the EC2 public IP under **Network Access** in Atlas
- If the IP changes (elastic IP not set), re-whitelist after reboot

---

## Deploy timing

| Scenario | Time |
|----------|------|
| Frontend (Vercel) | ~1-2 min |
| Backend — cache hit (no package.json change) | ~2 min |
| Backend — cache miss (dependencies changed) | ~5 min |

# 🚀 S.P.A.R.K. — Production Deployment Guide (India)

This guide deploys the full stack (frontend + API + PostgreSQL) as Docker
containers. Works on any Indian cloud host: **AWS Mumbai (ap-south-1), DigitalOcean
Bangalore (BLR1), Hostinger/E2E Networks (Mumbai), Azure Central India, or a
self-hosted Ubuntu VPS**.

---

## 1. Prerequisites

- Ubuntu 22.04+ VPS with 2 GB RAM minimum (4 GB recommended)
- Docker Engine + Docker Compose plugin:
  ```bash
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker $USER   # log out & back in
  ```
- A domain name (e.g. `spark.ac.in`) pointed to your server's IP (A record)
- If serving from India: no special license needed for a private platform, but
  comply with the **DPDP Act 2023** (consent notice + data minimisation) since
  student PII is stored.

## 2. Configure environment

```bash
cp .env.example .env
nano .env
```

**Required values:**

| Variable | Why |
|---|---|
| `JWT_SECRET` | 64+ random chars: `openssl rand -hex 32` |
| `PGPASSWORD` | Strong DB password |
| `CORS_ORIGIN` | `https://spark.ac.in` (your domain) |

**Optional but recommended:**

| Variable | Why |
|---|---|
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | Free live job listings (developer.adzuna.com) |
| `SERPAPI_KEY` | Paid Google Jobs fallback (serpapi.com) |
| `GEMINI_API_KEY` | AI Copilot + ID-card vision OCR |
| `SMTP_USER` / `SMTP_PASS` | Gmail App Password for real OTP emails |
| `AUTO_SYNC_CRON=true` | Auto-refresh live jobs every 3 h |
| `SEED_LARGE_DATASET=true` | One-time realistic dataset (210 students / 60 jobs / 12 MoUs) |

## 3. Launch

```bash
docker compose up -d --build
docker compose logs -f app     # watch startup: schema → seed → ready
```

The app is now on `http://<server-ip>:5000` — Express serves both the API
(`/api/*`) and the built React frontend, so there is a **single origin** and
CORS is trivial.

## 4. HTTPS (mandatory for JWT + OTP flows)

Install Caddy (auto-HTTPS reverse proxy, zero config):

```bash
sudo apt install -y caddy
sudo tee /etc/caddy/Caddyfile <<'EOF'
spark.ac.in {
    reverse_proxy localhost:5000
}
EOF
sudo systemctl reload caddy
```

Caddy obtains and renews Let's Encrypt certificates automatically. Update
`CORS_ORIGIN=https://spark.ac.in` afterwards and `docker compose up -d` again.

> **SSE note:** Caddy streams Server-Sent Events out of the box (no buffering
> config needed). If you use Nginx instead, add
> `proxy_set_header Connection ''; proxy_buffering off;` to the `/api/events`
> location.

## 5. First-run checklist

1. Open `https://spark.ac.in` — the public landing page loads with live DB stats.
2. Register a student account → OTP email arrives → college name verifies
   against the accredited registry (green badge).
3. Sign in → JWT issued; Navbar shows your portal; notifications stream live.
4. Admin GUI at `/admin` is JWT-protected — sign in first, then visit.

## 6. Operations

```bash
docker compose ps                 # status
docker compose logs -f app        # tail logs
docker compose exec db pg_dump -U spark avishkar_db > backup_$(date +%F).sql
docker compose down && docker compose up -d --build   # deploy new version
```

Set up a nightly cron on the host:
```
0 2 * * *  cd /opt/spark && docker compose exec -T db pg_dump -U spark avishkar_db | gzip > /backups/spark_$(date +\%F).sql.gz
```

## 7. Data sources & self-updating behaviour

| Data | Source | Updates automatically? |
|---|---|---|
| Job listings | Adzuna → Google Jobs → LinkedIn chain | ✅ with `AUTO_SYNC_CRON=true` (every 3 h) + on-demand searches |
| Students, applications, assessments | Your users via PostgreSQL | ✅ live |
| Notifications | SSE push (`/api/events`) | ✅ instant |
| Institutions registry | Curated 70+ accredited list + Hipolabs open API (frontend autocomplete) | ⚠️ registry is static — extend `src/data/institutions.ts` periodically |
| Salary benchmarks | Model estimates in `src/utils/salaryBenchmark.ts` | ❌ static heuristics — recalibrate quarterly |
| Analytics/regional stats | Seeded + live aggregation | ✅ reflects real DB state |

## 8. Hardening before go-live

- [ ] `JWT_SECRET` rotated and stored in a secret manager (not in `.env` in git)
- [ ] Postgres **not** exposed publicly (default in compose — leave it)
- [ ] Database backups cron verified by restoring once
- [ ] DPDP Act 2023 privacy notice added at registration
- [ ] Rate limits reviewed (`RATE_LIMIT_MAX` in `server/index.ts` is 20/15 min on auth)
- [ ] `NODE_ENV=production` (enables HSTS + CSP headers)
- [ ] Log rotation: `docker compose logs` grows unbounded — install `logrotate` or use `--log-driver=json-file --log-opt max-size=10m`

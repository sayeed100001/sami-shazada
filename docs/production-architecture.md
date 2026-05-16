# Production Architecture (100k Users Target)

## Core Topology

- Next.js app runs as multiple stateless instances behind a load balancer.
- PostgreSQL is managed and fronted by a connection pooler (PgBouncer).
- Upstash Redis is mandatory for distributed rate limiting and shared short-lived state.
- Blob/object storage is used for files and user-uploaded assets.

## Recommended Services

- App runtime: Vercel (multi-region) or containerized Node.js autoscaling cluster.
- Database: Managed PostgreSQL with HA, automated backups, PITR.
- Pooler: PgBouncer in transaction mode.
- Cache/rate-limit: Upstash Redis with production credentials.
- Monitoring: Sentry (errors) + infrastructure metrics (CPU, memory, response latency).

## Request Flow (High-Level)

1. Client request hits load balancer/CDN.
2. Next.js instance applies middleware auth/rate-limit policy.
3. Authenticated APIs use NextAuth JWT and database-backed access checks.
4. Business writes execute through Prisma transactions.
5. Audits and metrics are emitted for operational visibility.

## Scaling Baselines

- Start with at least 3 app instances (or equivalent autoscaling minimum).
- Enforce max DB connections per instance via pooler.
- Keep p95 API latency under 400ms for critical routes.
- Alert on:
  - p95 latency > 800ms for 5m
  - error rate > 2% for 5m
  - DB connection usage > 80%
  - Redis failures or timeouts

## Security and Operations Requirements

- Set `CRON_SECRET` (required) and keep it distinct from auth/session secrets.
- Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in production.
- Keep `ENABLE_DEV_ADMIN_ENDPOINTS` unset/false in production.
- Enable websocket server only intentionally with:
  - `ENABLE_WEBSOCKET_SERVER=true`
  - `WEBSOCKET_SERVER_TOKEN` strong random secret
- Restrict internal debugging endpoints to admin-only.

## Deployment Checklist

- `npm run ci:check` passes.
- Prisma migrations applied to production DB.
- Redis and secrets validated.
- Health endpoint checked by load balancer.
- Smoke tests:
  - visitor saraf directory and profile load
  - user signup/login and reward visibility
  - saraf hawala creation and branch payout lifecycle
  - exchange creation and stats reporting
  - admin settings/reporting pages load

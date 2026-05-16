# Database Backup & Disaster Recovery (Postgres)

This project can run an automated database backup every 12 hours via GitHub Actions.
Backups are stored in a separate private GitHub repository as timestamped `.sql.gz` files (compressed).

## What This Does

- Runs every 12 hours (UTC) and also supports manual runs.
- Uses `pg_dump` with a non-pooled Postgres URL (from GitHub Actions secrets).
- Writes a timestamped backup file:
  - `backups/backup-YYYYMMDD-HHMMSS.sql.gz`
  - `backups/backup-YYYYMMDD-HHMMSS.sql.gz.sha256` (checksum)
- Commits and pushes the backup to a private backup repository (using `GH_TOKEN`).
- Retains only the most recent backups (default: 60).
- Uploads the backup as a GitHub Actions artifact as a fallback.

## Setup Steps

1. Create a private GitHub repository for backups (example: `your-org/shazada-v2-backups`).
2. In the backup repo, create a folder `backups/` (optional, the workflow will create it).
3. Create a Personal Access Token (PAT) or Fine-grained token that can write to the backup repo.
   - Minimum required permission: write access to repository contents.
4. In your main repo, add these GitHub Actions secrets:
   - `DATABASE_URL_NON_POOLING` (recommended) or `DATABASE_URL_UNPOOLED`: your production Postgres connection string without a pooler
   - (fallback) `DATABASE_URL`: your production Postgres connection string
   - `BACKUP_REPO`: `owner/repo` of the private backup repository
   - `GH_TOKEN`: token with write access to `BACKUP_REPO`
5. Ensure the workflow file exists:
   - `.github/workflows/db-backup.yml`

## Restore (Disaster Recovery)

Pick a backup file from the backup repo (for example: `backups/backup-20260418-120000.sql.gz`).

## Admin Panel Notes

- In `Admin → System → Maintenance`, the app provides **local** export/restore utilities for SQLite and (only when available) Postgres tooling.
- On Vercel serverless, `pg_dump` / `psql` are typically **not** available. For production backups/restores, use the GitHub Actions workflow in this document.

### Restore into a fresh database (recommended)

1. Create a new empty Postgres database.
2. Set `DATABASE_URL` to that new database connection string.
3. Run:

```bash
gunzip -c backups/backup-YYYYMMDD-HHMMSS.sql.gz | psql "$DATABASE_URL" -v ON_ERROR_STOP=1
```

### Restore into an existing database (dangerous)

Restoring into a non-empty database can cause conflicts. Prefer restoring into a fresh database.
If you must restore into an existing database, you should drop/recreate the database (or schema) first.

## Notes / Security

- Secrets are read only from GitHub Actions secrets; nothing is hardcoded.
- The workflow does not echo the `DATABASE_URL`.
- Backups are plain SQL; treat the backup repo as sensitive and keep it private.

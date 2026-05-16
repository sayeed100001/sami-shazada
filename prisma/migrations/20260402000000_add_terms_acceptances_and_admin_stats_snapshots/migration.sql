-- Add TermsAcceptance + AdminStatsSnapshot (PostgreSQL)

CREATE TABLE IF NOT EXISTS "terms_acceptances" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "documentKey" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  CONSTRAINT "terms_acceptances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "terms_acceptances_userId_documentKey_key"
  ON "terms_acceptances"("userId", "documentKey");

CREATE INDEX IF NOT EXISTS "terms_acceptances_userId_acceptedAt_idx"
  ON "terms_acceptances"("userId", "acceptedAt");

ALTER TABLE "terms_acceptances"
  ADD CONSTRAINT "terms_acceptances_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "admin_stats_snapshots" (
  "id" TEXT NOT NULL,
  "label" TEXT,
  "payload" JSONB NOT NULL,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_stats_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "admin_stats_snapshots_createdAt_idx"
  ON "admin_stats_snapshots"("createdAt");


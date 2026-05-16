CREATE TABLE "blacklists" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "normalizedValue" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "addedBy" TEXT NOT NULL,
    "sarafId" TEXT,
    "scopeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blacklists_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "blacklists_type_normalizedValue_scopeKey_key" ON "blacklists"("type", "normalizedValue", "scopeKey");
CREATE INDEX "blacklists_sarafId_createdAt_idx" ON "blacklists"("sarafId", "createdAt");
CREATE INDEX "blacklists_type_normalizedValue_idx" ON "blacklists"("type", "normalizedValue");

ALTER TABLE "blacklists"
ADD CONSTRAINT "blacklists_sarafId_fkey"
FOREIGN KEY ("sarafId") REFERENCES "sarafs"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

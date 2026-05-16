CREATE TABLE "portal_connection_requests" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "portal_connection_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "portal_connection_requests_requesterId_targetId_key" ON "portal_connection_requests"("requesterId", "targetId");
CREATE INDEX "portal_connection_requests_requesterId_status_createdAt_idx" ON "portal_connection_requests"("requesterId", "status", "createdAt");
CREATE INDEX "portal_connection_requests_targetId_status_createdAt_idx" ON "portal_connection_requests"("targetId", "status", "createdAt");

ALTER TABLE "portal_connection_requests"
ADD CONSTRAINT "portal_connection_requests_requesterId_fkey"
FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "portal_connection_requests"
ADD CONSTRAINT "portal_connection_requests_targetId_fkey"
FOREIGN KEY ("targetId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

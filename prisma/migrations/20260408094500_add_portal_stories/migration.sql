CREATE TABLE "portal_stories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caption" TEXT,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "backgroundStyle" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portal_stories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "portal_story_views" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_story_views_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "portal_story_views_storyId_viewerId_key" ON "portal_story_views"("storyId", "viewerId");
CREATE INDEX "portal_stories_userId_createdAt_idx" ON "portal_stories"("userId", "createdAt");
CREATE INDEX "portal_stories_expiresAt_idx" ON "portal_stories"("expiresAt");
CREATE INDEX "portal_story_views_viewerId_viewedAt_idx" ON "portal_story_views"("viewerId", "viewedAt");

ALTER TABLE "portal_stories" ADD CONSTRAINT "portal_stories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "portal_story_views" ADD CONSTRAINT "portal_story_views_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "portal_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "portal_story_views" ADD CONSTRAINT "portal_story_views_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "users"
ADD COLUMN "avatarUrl" TEXT;

ALTER TABLE "transactions"
ADD COLUMN "systemDiscountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "appliedRewardId" TEXT;

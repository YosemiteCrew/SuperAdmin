-- A rebuildable status index for the dashboard approval count.
-- SuperTokens UserMetadata remains the approval and enforcement source of truth.
CREATE TABLE "ApprovalStatusIndex" (
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "indexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalStatusIndex_pkey" PRIMARY KEY ("userId")
);

-- This table is server-owned and has no browser/Data API policy.
ALTER TABLE "ApprovalStatusIndex" ENABLE ROW LEVEL SECURITY;

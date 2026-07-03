-- Clinic federation directory listings (explicit opt-in, public fields only).
CREATE TABLE "DirectoryListing" (
    "orgId" TEXT NOT NULL,
    "listed" BOOLEAN NOT NULL DEFAULT false,
    "actorUri" TEXT NOT NULL,
    "orgName" TEXT NOT NULL,
    "instanceHost" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectoryListing_pkey" PRIMARY KEY ("orgId")
);

CREATE INDEX "DirectoryListing_listed_idx" ON "DirectoryListing"("listed");

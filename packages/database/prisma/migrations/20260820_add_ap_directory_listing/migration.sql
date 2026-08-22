-- CreateTable
CREATE TABLE "APDirectoryListing" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "instanceHost" TEXT NOT NULL,
    "actorUri" TEXT NOT NULL,
    "orgName" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "listed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "APDirectoryListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "APDirectoryListing_orgId_key" ON "APDirectoryListing"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "APDirectoryListing_actorUri_key" ON "APDirectoryListing"("actorUri");

-- CreateIndex
CREATE INDEX "APDirectoryListing_listed_idx" ON "APDirectoryListing"("listed");

-- CreateIndex
CREATE INDEX "APDirectoryListing_instanceHost_idx" ON "APDirectoryListing"("instanceHost");

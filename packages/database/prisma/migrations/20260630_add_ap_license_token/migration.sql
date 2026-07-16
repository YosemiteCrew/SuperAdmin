-- CreateTable
CREATE TABLE "APLicenseToken" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "instanceDomain" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,

    CONSTRAINT "APLicenseToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "APLicenseToken_orgId_idx" ON "APLicenseToken"("orgId");

-- CreateIndex
CREATE INDEX "APLicenseToken_instanceDomain_idx" ON "APLicenseToken"("instanceDomain");

-- CreateIndex
CREATE INDEX "APLicenseToken_revokedAt_idx" ON "APLicenseToken"("revokedAt");

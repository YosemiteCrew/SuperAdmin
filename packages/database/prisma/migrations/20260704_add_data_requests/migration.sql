-- CreateTable
CREATE TABLE "DataRequest" (
    "id" TEXT NOT NULL,
    "subjectEmail" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "notes" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "fulfilledAt" TIMESTAMP(3),
    "handledBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DataRequest_status_idx" ON "DataRequest"("status");

-- CreateIndex
CREATE INDEX "DataRequest_dueAt_idx" ON "DataRequest"("dueAt");

-- CreateIndex
CREATE INDEX "DataRequest_subjectEmail_idx" ON "DataRequest"("subjectEmail");

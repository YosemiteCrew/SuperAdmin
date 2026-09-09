-- Make direct recovery imports idempotent without changing existing intake rows.
ALTER TABLE "ContactRequest" ADD COLUMN "sourceRequestId" TEXT;

CREATE UNIQUE INDEX "ContactRequest_sourceRequestId_key"
ON "ContactRequest"("sourceRequestId");

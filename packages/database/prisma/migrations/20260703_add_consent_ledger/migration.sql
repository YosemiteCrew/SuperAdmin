-- GDPR consent ledger: anonymous-first subjects + append-only decision events.
CREATE TABLE "ConsentSubject" (
    "id" TEXT NOT NULL,
    "consentId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentSubject_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConsentSubject_consentId_key" ON "ConsentSubject"("consentId");
CREATE INDEX "ConsentSubject_userId_idx" ON "ConsentSubject"("userId");
CREATE INDEX "ConsentSubject_email_idx" ON "ConsentSubject"("email");

CREATE TABLE "ConsentEvent" (
    "id" TEXT NOT NULL,
    "seq" BIGSERIAL NOT NULL,
    "subjectId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "source" TEXT NOT NULL,
    "policyVersion" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ConsentEvent_subjectId_category_seq_idx" ON "ConsentEvent"("subjectId", "category", "seq");
CREATE INDEX "ConsentEvent_createdAt_idx" ON "ConsentEvent"("createdAt");

ALTER TABLE "ConsentEvent" ADD CONSTRAINT "ConsentEvent_subjectId_fkey"
    FOREIGN KEY ("subjectId") REFERENCES "ConsentSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

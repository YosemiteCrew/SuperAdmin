-- Contact-us leads and their submissions (marketing-site intake).
CREATE TABLE "ContactLead" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "company" TEXT,
    "newsletterConsent" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMP(3),
    "consentSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactLead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContactLead_email_key" ON "ContactLead"("email");
CREATE INDEX "ContactLead_createdAt_idx" ON "ContactLead"("createdAt");

CREATE TABLE "ContactRequest" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "handledBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContactRequest_leadId_idx" ON "ContactRequest"("leadId");
CREATE INDEX "ContactRequest_status_idx" ON "ContactRequest"("status");
CREATE INDEX "ContactRequest_createdAt_idx" ON "ContactRequest"("createdAt");

ALTER TABLE "ContactRequest" ADD CONSTRAINT "ContactRequest_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "ContactLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

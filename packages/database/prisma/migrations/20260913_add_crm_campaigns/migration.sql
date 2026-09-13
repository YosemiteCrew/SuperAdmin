CREATE TYPE "CrmCampaignAudience" AS ENUM ('all', 'admins');

CREATE TABLE "CrmCampaign" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "preview" TEXT NOT NULL,
    "audience" "CrmCampaignAudience" NOT NULL,
    "sentCount" INTEGER NOT NULL,
    "failedCount" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "sentBy" TEXT NOT NULL,
    "sentByEmail" TEXT NOT NULL,

    CONSTRAINT "CrmCampaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CrmCampaign_sentAt_id_idx" ON "CrmCampaign"("sentAt", "id");

ALTER TABLE "CrmCampaign" ENABLE ROW LEVEL SECURITY;

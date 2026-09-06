CREATE TABLE "OrgNote" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrgNote_orgId_at_idx" ON "OrgNote"("orgId", "at");

ALTER TABLE "OrgNote" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "OrgNoteImport" (
    "orgId" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgNoteImport_pkey" PRIMARY KEY ("orgId")
);

ALTER TABLE "OrgNoteImport" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "AuditEvent" (
    "seq" BIGSERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetLabel" TEXT,
    "at" TIMESTAMP(3) NOT NULL,
    "prevHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuditEvent_seq_key" ON "AuditEvent"("seq");
CREATE INDEX "AuditEvent_actorId_seq_idx" ON "AuditEvent"("actorId", "seq");
CREATE INDEX "AuditEvent_targetId_seq_idx" ON "AuditEvent"("targetId", "seq");
CREATE INDEX "AuditEvent_at_idx" ON "AuditEvent"("at");

ALTER TABLE "AuditEvent" ENABLE ROW LEVEL SECURITY;

-- This blocks ordinary mutation through the application owner. That owner can
-- still deliberately drop the trigger or table; no in-database control can
-- protect itself from its owner.
CREATE FUNCTION prevent_audit_event_mutation()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'AuditEvent rows are append-only';
END;
$$ LANGUAGE plpgsql
SET search_path = '';

CREATE TRIGGER "AuditEvent_append_only"
BEFORE UPDATE OR DELETE ON "AuditEvent"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_mutation();

CREATE TRIGGER "AuditEvent_no_truncate"
BEFORE TRUNCATE ON "AuditEvent"
FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_event_mutation();

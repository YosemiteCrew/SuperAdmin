-- The marketing-site contact form collects an optional phone number; keep it
-- on the lead (like name/company) so the team can actually call back.
ALTER TABLE "ContactLead" ADD COLUMN "phone" TEXT;

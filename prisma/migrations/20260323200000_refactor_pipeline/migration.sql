-- Rename columns (preserves data)
ALTER TABLE "snails" RENAME COLUMN "award_status" TO "track";
ALTER TABLE "snails" RENAME COLUMN "pipeline_stage" TO "stage";

-- Add former_awardee flag
ALTER TABLE "snails" ADD COLUMN "former_awardee" BOOLEAN NOT NULL DEFAULT false;

-- Set default for track
ALTER TABLE "snails" ALTER COLUMN "track" SET DEFAULT 'lead';

-- Data migration: map old values to new

-- Former awardees get the flag
UPDATE "snails" SET "former_awardee" = true WHERE "track" = 'Former / Lapsed Awardee';

-- Map award_status values to track
UPDATE "snails" SET "track" = 'active' WHERE "track" = 'Active Awardee 2026';
UPDATE "snails" SET "track" = 'lead' WHERE "track" = 'Former / Lapsed Awardee';
UPDATE "snails" SET "track" = 'lead' WHERE "track" = 'Lead / Target';
UPDATE "snails" SET "track" = 'lead' WHERE "track" IS NULL;

-- Map pipeline_stage values to new stage names
UPDATE "snails" SET "stage" = 'Contacted' WHERE "stage" = '1 - Contacted';
UPDATE "snails" SET "stage" = 'Active' WHERE "stage" = 'Awarded';
UPDATE "snails" SET "stage" = 'Lapsed' WHERE "stage" = 'Former';

-- Former awardees with no stage get Lapsed
UPDATE "snails" SET "stage" = 'Lapsed' WHERE "former_awardee" = true AND "stage" IS NULL;

-- Leads with no stage get New
UPDATE "snails" SET "stage" = 'New' WHERE "track" = 'lead' AND "former_awardee" = false AND "stage" IS NULL;

-- Active with no stage get Active
UPDATE "snails" SET "stage" = 'Active' WHERE "track" = 'active' AND "stage" IS NULL;

-- Fix leads that ended up with 'Active' stage (from old 'Awarded' mapping)
UPDATE "snails" SET "stage" = 'Lapsed' WHERE "track" = 'lead' AND "stage" = 'Active' AND "former_awardee" = true;
UPDATE "snails" SET "stage" = 'New' WHERE "track" = 'lead' AND "stage" = 'Active' AND "former_awardee" = false;

-- Make track NOT NULL now that all values are set
ALTER TABLE "snails" ALTER COLUMN "track" SET NOT NULL;

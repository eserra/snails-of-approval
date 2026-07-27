-- AlterTable: SFUSA submission fields on the establishment
ALTER TABLE "snails" ADD COLUMN "city" TEXT;
ALTER TABLE "snails" ADD COLUMN "state" TEXT;
ALTER TABLE "snails" ADD COLUMN "other_social" TEXT;

-- AlterTable: contact-level fields (vanity phone + primary designation)
ALTER TABLE "contacts" ADD COLUMN "phone_vanity" TEXT;
ALTER TABLE "contacts" ADD COLUMN "is_primary" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: mark exactly one primary contact per snail (the earliest row).
-- Safe even if a snail somehow has more than one contact.
UPDATE "contacts"
SET "is_primary" = true
WHERE "id" IN (
    SELECT MIN("id") FROM "contacts" GROUP BY "snail_id"
);

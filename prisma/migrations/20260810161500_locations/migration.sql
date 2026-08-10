-- Move snail geography onto a Location model so a snail can have several addresses.
-- Mirrors the Contact model: one row is the main one (is_primary), which is what the
-- SFUSA export uses. Kinds are documented in lib/location-kinds.ts.

-- CreateTable
CREATE TABLE "locations" (
    "id" SERIAL NOT NULL,
    "label" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'storefront',
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "borough" TEXT,
    "zip" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "snail_id" INTEGER NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "locations_snail_id_idx" ON "locations"("snail_id");

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_snail_id_fkey" FOREIGN KEY ("snail_id") REFERENCES "snails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every snail that has any geography becomes one primary storefront location.
-- Must run before the columns are dropped below.
INSERT INTO "locations" (
    "kind", "address", "city", "state", "borough", "zip",
    "latitude", "longitude", "is_public", "is_primary",
    "created_at", "updated_at", "snail_id"
)
SELECT
    'storefront',
    "address", "city", "state", "borough", "zip",
    "latitude", "longitude",
    true, true,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
    "id"
FROM "snails"
WHERE "address" IS NOT NULL
   OR "city" IS NOT NULL
   OR "state" IS NOT NULL
   OR "borough" IS NOT NULL
   OR "zip" IS NOT NULL
   OR "latitude" IS NOT NULL
   OR "longitude" IS NOT NULL;

-- AlterTable
ALTER TABLE "snails" DROP COLUMN "address",
DROP COLUMN "borough",
DROP COLUMN "city",
DROP COLUMN "latitude",
DROP COLUMN "longitude",
DROP COLUMN "state",
DROP COLUMN "zip";

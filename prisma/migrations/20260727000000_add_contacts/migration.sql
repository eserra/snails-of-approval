-- CreateTable
CREATE TABLE "contacts" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'general',
    "email" TEXT,
    "phone" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "snail_id" INTEGER NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contacts_snail_id_idx" ON "contacts"("snail_id");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_snail_id_fkey" FOREIGN KEY ("snail_id") REFERENCES "snails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data migration: fold each snail's single contact (contact_name/email/phone) into a
-- "general" contact row. These fields were shown publicly, so keep them public.
INSERT INTO "contacts" ("name", "role", "email", "phone", "is_public", "snail_id", "created_at", "updated_at")
SELECT
    COALESCE(NULLIF("contact_name", ''), "name"),
    'general',
    NULLIF("email", ''),
    NULLIF("phone", ''),
    true,
    "id",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "snails"
WHERE (COALESCE("contact_name", '') <> '')
   OR (COALESCE("email", '') <> '')
   OR (COALESCE("phone", '') <> '');

-- DropColumns (now migrated into the contacts table)
ALTER TABLE "snails" DROP COLUMN "contact_name";
ALTER TABLE "snails" DROP COLUMN "email";
ALTER TABLE "snails" DROP COLUMN "phone";

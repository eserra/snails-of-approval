-- DropForeignKey
ALTER TABLE "snails" DROP CONSTRAINT "snails_category_id_fkey";

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "parent_id" INTEGER;

-- AlterTable
ALTER TABLE "snails" ADD COLUMN     "assignee_id" INTEGER,
ADD COLUMN     "award_status" TEXT,
ADD COLUMN     "blocked_reason" TEXT,
ADD COLUMN     "borough" TEXT,
ADD COLUMN     "business_status" TEXT,
ADD COLUMN     "contact_name" TEXT,
ADD COLUMN     "diversity_tags" TEXT,
ADD COLUMN     "establishment_type" TEXT,
ADD COLUMN     "last_touch_date" TIMESTAMP(3),
ADD COLUMN     "on_sfusa_map" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pipeline_stage" TEXT,
ADD COLUMN     "renewal_due_year" INTEGER,
ADD COLUMN     "sfusa_category" TEXT,
ADD COLUMN     "sfusa_subtype" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "stickers_delivered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "welcome_letter_sent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "zip" TEXT,
ALTER COLUMN "year_awarded" DROP NOT NULL,
ALTER COLUMN "category_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "notes" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snail_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snails" ADD CONSTRAINT "snails_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snails" ADD CONSTRAINT "snails_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_snail_id_fkey" FOREIGN KEY ("snail_id") REFERENCES "snails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "snails" ADD COLUMN     "certificate_requested_date" TIMESTAMP(3),
ADD COLUMN     "certificate_sent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "digital_assets_sent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "press_release_sent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "social_announced" BOOLEAN NOT NULL DEFAULT false;

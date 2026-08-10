-- CreateTable
CREATE TABLE "check_ins" (
    "id" SERIAL NOT NULL,
    "visited_at" TIMESTAMP(3) NOT NULL,
    "party_size" INTEGER NOT NULL,
    "occasion" TEXT,
    "amount" DECIMAL(10,2),
    "notes" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snail_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "check_ins_snail_id_idx" ON "check_ins"("snail_id");

-- CreateIndex
CREATE INDEX "check_ins_visited_at_idx" ON "check_ins"("visited_at");

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_snail_id_fkey" FOREIGN KEY ("snail_id") REFERENCES "snails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

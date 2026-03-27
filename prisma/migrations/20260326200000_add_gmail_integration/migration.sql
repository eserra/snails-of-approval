-- CreateTable
CREATE TABLE "gmail_accounts" (
    "id" SERIAL NOT NULL,
    "email_address" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "token_expiry" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "chapter_id" INTEGER,
    "user_id" INTEGER,

    CONSTRAINT "gmail_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_cache" (
    "id" SERIAL NOT NULL,
    "gmail_message_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "subject" TEXT,
    "from_address" TEXT NOT NULL,
    "to_addresses" TEXT NOT NULL,
    "snippet" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gmail_account_id" INTEGER NOT NULL,
    "snail_id" INTEGER,

    CONSTRAINT "email_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gmail_accounts_chapter_id_key" ON "gmail_accounts"("chapter_id");

-- CreateIndex
CREATE UNIQUE INDEX "gmail_accounts_user_id_key" ON "gmail_accounts"("user_id");

-- CreateIndex
CREATE INDEX "email_cache_snail_id_idx" ON "email_cache"("snail_id");

-- CreateIndex
CREATE INDEX "email_cache_gmail_account_id_received_at_idx" ON "email_cache"("gmail_account_id", "received_at");

-- CreateIndex
CREATE INDEX "email_cache_from_address_idx" ON "email_cache"("from_address");

-- CreateIndex
CREATE UNIQUE INDEX "email_cache_gmail_account_id_gmail_message_id_key" ON "email_cache"("gmail_account_id", "gmail_message_id");

-- AddForeignKey
ALTER TABLE "gmail_accounts" ADD CONSTRAINT "gmail_accounts_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gmail_accounts" ADD CONSTRAINT "gmail_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_cache" ADD CONSTRAINT "email_cache_gmail_account_id_fkey" FOREIGN KEY ("gmail_account_id") REFERENCES "gmail_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_cache" ADD CONSTRAINT "email_cache_snail_id_fkey" FOREIGN KEY ("snail_id") REFERENCES "snails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

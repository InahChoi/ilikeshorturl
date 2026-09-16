-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "short_urls" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "short_code" VARCHAR(32) NOT NULL,
    "original_url" TEXT NOT NULL,
    "title" VARCHAR(255),
    "expires_at" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "click_count" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "short_urls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clicks" (
    "id" UUID NOT NULL,
    "short_url_id" UUID NOT NULL,
    "ip" VARCHAR(45),
    "user_agent" TEXT,
    "referer" TEXT,
    "clicked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clicks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "short_urls_short_code_key" ON "short_urls"("short_code");

-- CreateIndex
CREATE INDEX "short_urls_user_id_idx" ON "short_urls"("user_id");

-- CreateIndex
CREATE INDEX "short_urls_created_at_idx" ON "short_urls"("created_at" DESC);

-- CreateIndex
CREATE INDEX "short_urls_expires_at_idx" ON "short_urls"("expires_at");

-- CreateIndex
CREATE INDEX "clicks_short_url_id_idx" ON "clicks"("short_url_id");

-- CreateIndex
CREATE INDEX "clicks_clicked_at_idx" ON "clicks"("clicked_at" DESC);

-- AddForeignKey
ALTER TABLE "short_urls" ADD CONSTRAINT "short_urls_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_short_url_id_fkey" FOREIGN KEY ("short_url_id") REFERENCES "short_urls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

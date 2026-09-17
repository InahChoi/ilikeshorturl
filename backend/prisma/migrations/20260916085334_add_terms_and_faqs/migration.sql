-- CreateEnum
CREATE TYPE "TermType" AS ENUM ('TERMS_OF_SERVICE', 'PRIVACY_POLICY');

-- CreateTable
CREATE TABLE "terms" (
    "id" UUID NOT NULL,
    "type" "TermType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "version" VARCHAR(32) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "published_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" UUID NOT NULL,
    "question" VARCHAR(500) NOT NULL,
    "answer" TEXT NOT NULL,
    "category" VARCHAR(100),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "terms_type_is_active_idx" ON "terms"("type", "is_active");

-- CreateIndex
CREATE INDEX "terms_published_at_idx" ON "terms"("published_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "terms_type_version_key" ON "terms"("type", "version");

-- CreateIndex
CREATE INDEX "faqs_is_active_sort_order_idx" ON "faqs"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "faqs_category_idx" ON "faqs"("category");

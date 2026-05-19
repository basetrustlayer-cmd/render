-- CreateEnum
CREATE TYPE "TrustTier" AS ENUM ('NEW', 'BUILDING', 'VERIFIED', 'TRUSTED');

-- CreateEnum
CREATE TYPE "ListingCategory" AS ENUM ('VEHICLES', 'REAL_ESTATE', 'ELECTRONICS', 'JOBS', 'SERVICES', 'FASHION');

-- CreateEnum
CREATE TYPE "ListingCondition" AS ENUM ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('PENDING', 'LIVE', 'MANUAL_REVIEW', 'REJECTED', 'SOLD', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SafeDealStatus" AS ENUM ('INITIATED', 'FUNDED', 'DELIVERED', 'CONFIRMED', 'DISPUTED', 'REFUNDED', 'COMPLETE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "trustlayer_user_id" VARCHAR(64) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "verification_level" SMALLINT NOT NULL DEFAULT 0,
    "trust_score" SMALLINT,
    "trust_tier" "TrustTier",
    "is_business" BOOLEAN NOT NULL DEFAULT false,
    "is_suspended" BOOLEAN NOT NULL DEFAULT false,
    "whatsapp_number" VARCHAR(20),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "price_negotiable" BOOLEAN NOT NULL DEFAULT false,
    "category" "ListingCategory" NOT NULL,
    "subcategory" VARCHAR(100),
    "condition" "ListingCondition",
    "location_region" VARCHAR(100),
    "location_lat" DECIMAL(9,6),
    "location_lng" DECIMAL(9,6),
    "status" "ListingStatus" NOT NULL DEFAULT 'PENDING',
    "fraud_risk_score" DECIMAL(4,3),
    "views_count" INTEGER NOT NULL DEFAULT 0,
    "saves_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safe_deals" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "buyer_id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "fee_amount" DECIMAL(12,2) NOT NULL,
    "status" "SafeDealStatus" NOT NULL DEFAULT 'INITIATED',
    "paystack_reference" VARCHAR(100),
    "trustlayer_txn_id" VARCHAR(100),
    "funded_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "confirmed_at" TIMESTAMPTZ(6),
    "inspection_deadline" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "safe_deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "safe_deal_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "reviewee_id" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "body" TEXT,
    "trustlayer_ref" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_images" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "cloudinary_id" VARCHAR(200) NOT NULL,
    "url" TEXT NOT NULL,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_trustlayer_user_id_key" ON "users"("trustlayer_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "listings_seller_id_idx" ON "listings"("seller_id");

-- CreateIndex
CREATE INDEX "listings_status_idx" ON "listings"("status");

-- CreateIndex
CREATE INDEX "listings_category_idx" ON "listings"("category");

-- CreateIndex
CREATE INDEX "listings_location_region_idx" ON "listings"("location_region");

-- CreateIndex
CREATE INDEX "safe_deals_listing_id_idx" ON "safe_deals"("listing_id");

-- CreateIndex
CREATE INDEX "safe_deals_buyer_id_idx" ON "safe_deals"("buyer_id");

-- CreateIndex
CREATE INDEX "safe_deals_seller_id_idx" ON "safe_deals"("seller_id");

-- CreateIndex
CREATE INDEX "safe_deals_status_idx" ON "safe_deals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_safe_deal_id_key" ON "reviews"("safe_deal_id");

-- CreateIndex
CREATE INDEX "reviews_reviewer_id_idx" ON "reviews"("reviewer_id");

-- CreateIndex
CREATE INDEX "reviews_reviewee_id_idx" ON "reviews"("reviewee_id");

-- CreateIndex
CREATE INDEX "listing_images_listing_id_idx" ON "listing_images"("listing_id");

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safe_deals" ADD CONSTRAINT "safe_deals_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safe_deals" ADD CONSTRAINT "safe_deals_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safe_deals" ADD CONSTRAINT "safe_deals_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_safe_deal_id_fkey" FOREIGN KEY ("safe_deal_id") REFERENCES "safe_deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewee_id_fkey" FOREIGN KEY ("reviewee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_images" ADD CONSTRAINT "listing_images_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

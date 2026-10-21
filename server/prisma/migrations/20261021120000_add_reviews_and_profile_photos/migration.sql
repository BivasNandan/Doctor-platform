-- Profile photos (stored in the private object-storage bucket) and doctor reviews.
ALTER TABLE "users" ADD COLUMN "photo_key" TEXT;
ALTER TABLE "users" ADD COLUMN "photo_updated_at" TIMESTAMPTZ(3);

CREATE TYPE "ReviewStatus" AS ENUM ('visible', 'hidden');

CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "status" "ReviewStatus" NOT NULL DEFAULT 'visible',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reviews_rating_range" CHECK ("rating" BETWEEN 1 AND 5),
    CONSTRAINT "reviews_comment_length" CHECK (char_length("comment") <= 1000)
);

CREATE UNIQUE INDEX "reviews_patient_id_doctor_id_key" ON "reviews"("patient_id", "doctor_id");
CREATE INDEX "reviews_doctor_id_status_created_at_idx" ON "reviews"("doctor_id", "status", "created_at");

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_doctor_id_fkey"
    FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

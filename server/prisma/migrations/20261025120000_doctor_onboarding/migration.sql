-- Doctor onboarding: application status, BMDC certificate check and admin invitations.

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('invited', 'in_progress', 'submitted', 'changes_requested', 'rejected', 'approved');

-- CreateEnum
CREATE TYPE "BmdcCheck" AS ENUM ('unchecked', 'matched', 'not_found', 'mismatch');

-- CreateEnum
CREATE TYPE "CertificateKind" AS ENUM ('bmdc', 'degree', 'other');

-- AlterTable
ALTER TABLE "doctors" ADD COLUMN     "bmdc_check" "BmdcCheck" NOT NULL DEFAULT 'unchecked',
ADD COLUMN     "bmdc_check_note" TEXT,
ADD COLUMN     "bmdc_checked_at" TIMESTAMPTZ(3),
ADD COLUMN     "bmdc_checked_by_id" UUID,
ADD COLUMN     "decided_at" TIMESTAMPTZ(3),
ADD COLUMN     "decision_note" TEXT,
ADD COLUMN     "onboarding_status" "OnboardingStatus" NOT NULL DEFAULT 'in_progress',
ADD COLUMN     "submitted_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "doctor_certificates" ADD COLUMN     "kind" "CertificateKind" NOT NULL DEFAULT 'other';

-- CreateTable
CREATE TABLE "doctor_invitations" (
    "id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "invited_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "doctor_invitations_token_hash_key" ON "doctor_invitations"("token_hash");

-- CreateIndex
CREATE INDEX "doctor_invitations_doctor_id_idx" ON "doctor_invitations"("doctor_id");

-- CreateIndex
CREATE INDEX "doctors_onboarding_status_idx" ON "doctors"("onboarding_status");

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_bmdc_checked_by_id_fkey" FOREIGN KEY ("bmdc_checked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_invitations" ADD CONSTRAINT "doctor_invitations_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_invitations" ADD CONSTRAINT "doctor_invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Doctors who were already on Carewell keep working: verified or suspended profiles were
-- onboarded, rejected ones stay rejected, and pending ones wait in the administrator's queue.
UPDATE "doctors" SET
  "onboarding_status" = CASE "verification_status"
    WHEN 'rejected' THEN 'rejected'::"OnboardingStatus"
    WHEN 'pending' THEN 'submitted'::"OnboardingStatus"
    ELSE 'approved'::"OnboardingStatus"
  END,
  "submitted_at" = CASE WHEN "verification_status" = 'pending' THEN "created_at" END,
  "decided_at" = CASE WHEN "verification_status" <> 'pending' THEN "updated_at" END;


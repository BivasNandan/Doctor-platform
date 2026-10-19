-- Align the schema with the frontend contract and fix the relationships.
--
-- Safe only while the affected tables are empty (true when this was written: every table had
-- 0 rows). Columns and tables that are dropped or re-typed below would lose data otherwise.
--
--  * users: one `name`, `phone`, `account_status`, `email_verified_at`
--  * doctors: single specialty, `image`, `qualifications[]`, `fee`, `location`, `publication_status`,
--    `profile_review_required`; the doctor_specialties join table is removed
--  * clinics: type, area, opening hours, image, active flag
--  * availability_slots: clinic, local date + times, doctor-controlled status
--  * appointments: contact details, `relationship` (family booking), `completed` status,
--    composite foreign key that keeps slot, doctor and clinic consistent
--  * conversations: one per patient + doctor (plus a doctor/admin thread)
--  * new: sessions, email_verifications, password_resets, doctor_certificates,
--    deactivation_requests, support_requests, audit_log
--  * lower-case enum values so the API returns exactly what the contract says
-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('active', 'suspended', 'deactivated', 'deactivation_requested');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('published', 'unpublished', 'inactive');

-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('clinic', 'hospital');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('available', 'unavailable');

-- CreateEnum
CREATE TYPE "Relationship" AS ENUM ('self', 'child', 'parent', 'spouse', 'sibling', 'other');

-- CreateEnum
CREATE TYPE "ConversationKind" AS ENUM ('patient_doctor', 'doctor_admin');

-- CreateEnum
CREATE TYPE "DeactivationStatus" AS ENUM ('open', 'approved', 'declined');

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('patient', 'doctor', 'admin');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'patient';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "VerificationStatus_new" AS ENUM ('pending', 'verified', 'rejected', 'suspended');
ALTER TABLE "doctors" ALTER COLUMN "verification_status" DROP DEFAULT;
ALTER TABLE "doctors" ALTER COLUMN "verification_status" TYPE "VerificationStatus_new" USING ("verification_status"::text::"VerificationStatus_new");
ALTER TYPE "VerificationStatus" RENAME TO "VerificationStatus_old";
ALTER TYPE "VerificationStatus_new" RENAME TO "VerificationStatus";
DROP TYPE "VerificationStatus_old";
ALTER TABLE "doctors" ALTER COLUMN "verification_status" SET DEFAULT 'pending';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "AppointmentStatus_new" AS ENUM ('pending', 'accepted', 'rejected', 'cancelled', 'completed');
ALTER TABLE "appointments" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "appointments" ALTER COLUMN "status" TYPE "AppointmentStatus_new" USING ("status"::text::"AppointmentStatus_new");
ALTER TYPE "AppointmentStatus" RENAME TO "AppointmentStatus_old";
ALTER TYPE "AppointmentStatus_new" RENAME TO "AppointmentStatus";
DROP TYPE "AppointmentStatus_old";
ALTER TABLE "appointments" ALTER COLUMN "status" SET DEFAULT 'pending';
COMMIT;

-- DropForeignKey
ALTER TABLE "doctor_specialties" DROP CONSTRAINT "doctor_specialties_doctor_id_fkey";

-- DropForeignKey
ALTER TABLE "doctor_specialties" DROP CONSTRAINT "doctor_specialties_specialty_id_fkey";

-- DropForeignKey
ALTER TABLE "doctor_clinics" DROP CONSTRAINT "doctor_clinics_clinic_id_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_slot_id_fkey";

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_appointment_id_fkey";

-- DropIndex
DROP INDEX "users_first_name_last_name_idx";

-- DropIndex
DROP INDEX "doctors_verification_status_is_published_idx";

-- DropIndex
DROP INDEX "clinics_city_idx";

-- DropIndex
DROP INDEX "availability_slots_doctor_id_start_time_idx";

-- DropIndex
DROP INDEX "conversations_appointment_id_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "first_name",
DROP COLUMN "is_active",
DROP COLUMN "last_name",
ADD COLUMN     "account_status" "AccountStatus" NOT NULL DEFAULT 'active',
ADD COLUMN     "email_verified_at" TIMESTAMPTZ(3),
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT,
ALTER COLUMN "role" SET DEFAULT 'patient',
ALTER COLUMN "last_seen_at" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "doctors" DROP COLUMN "consultation_fee",
DROP COLUMN "is_published",
ADD COLUMN     "fee" INTEGER NOT NULL,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "location" TEXT NOT NULL,
ADD COLUMN     "profile_review_required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publication_status" "PublicationStatus" NOT NULL DEFAULT 'unpublished',
ADD COLUMN     "specialty_id" TEXT NOT NULL,
DROP COLUMN "qualifications",
ADD COLUMN     "qualifications" TEXT[],
ALTER COLUMN "experience_years" SET NOT NULL,
ALTER COLUMN "experience_years" SET DEFAULT 0,
ALTER COLUMN "verification_status" SET DEFAULT 'pending',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "specialties" DROP CONSTRAINT "specialties_pkey",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "specialties_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "clinics" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "area" TEXT NOT NULL,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "latitude" DECIMAL(9,6),
ADD COLUMN     "longitude" DECIMAL(9,6),
ADD COLUMN     "opening_hours" TEXT,
ADD COLUMN     "type" "FacilityType" NOT NULL DEFAULT 'clinic',
ALTER COLUMN "phone" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "doctor_clinics" ADD COLUMN     "fee" INTEGER;

-- AlterTable
ALTER TABLE "availability_slots" DROP COLUMN "is_available",
ADD COLUMN     "clinic_id" UUID NOT NULL,
ADD COLUMN     "date" DATE NOT NULL,
ADD COLUMN     "status" "SlotStatus" NOT NULL DEFAULT 'available',
ALTER COLUMN "start_time" SET DATA TYPE TIME(0),
ALTER COLUMN "end_time" SET DATA TYPE TIME(0),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "patient_name" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL,
ADD COLUMN     "reason" TEXT NOT NULL,
ADD COLUMN     "relationship" "Relationship" NOT NULL DEFAULT 'self',
ALTER COLUMN "status" SET DEFAULT 'pending',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "conversations" DROP COLUMN "appointment_id",
ADD COLUMN     "doctor_id" UUID NOT NULL,
ADD COLUMN     "kind" "ConversationKind" NOT NULL DEFAULT 'patient_doctor',
ADD COLUMN     "patient_id" UUID,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "messages" DROP COLUMN "content",
ADD COLUMN     "body" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "read_at" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "message_attachments" DROP COLUMN "file_url",
ADD COLUMN     "storage_key" TEXT NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3);

-- DropTable
DROP TABLE "doctor_specialties";

-- CreateTable
CREATE TABLE "email_verifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "user_agent" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_certificates" (
    "id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "uploaded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deactivation_requests" (
    "id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "DeactivationStatus" NOT NULL DEFAULT 'open',
    "decided_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMPTZ(3),

    CONSTRAINT "deactivation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "email" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_verifications_user_id_created_at_idx" ON "email_verifications"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_hash_key" ON "password_resets"("token_hash");

-- CreateIndex
CREATE INDEX "password_resets_user_id_idx" ON "password_resets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "doctor_certificates_doctor_id_idx" ON "doctor_certificates"("doctor_id");

-- CreateIndex
CREATE INDEX "deactivation_requests_doctor_id_status_idx" ON "deactivation_requests"("doctor_id", "status");

-- CreateIndex
CREATE INDEX "support_requests_created_at_idx" ON "support_requests"("created_at");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- CreateIndex
CREATE INDEX "users_name_idx" ON "users"("name");

-- CreateIndex
CREATE INDEX "doctors_specialty_id_idx" ON "doctors"("specialty_id");

-- CreateIndex
CREATE INDEX "doctors_verification_status_publication_status_idx" ON "doctors"("verification_status", "publication_status");

-- CreateIndex
CREATE INDEX "clinics_city_area_idx" ON "clinics"("city", "area");

-- CreateIndex
CREATE INDEX "clinics_active_idx" ON "clinics"("active");

-- CreateIndex
CREATE INDEX "availability_slots_doctor_id_date_idx" ON "availability_slots"("doctor_id", "date");

-- CreateIndex
CREATE INDEX "availability_slots_clinic_id_date_idx" ON "availability_slots"("clinic_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "availability_slots_id_doctor_id_clinic_id_key" ON "availability_slots"("id", "doctor_id", "clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "availability_slots_doctor_id_clinic_id_date_start_time_key" ON "availability_slots"("doctor_id", "clinic_id", "date", "start_time");

-- CreateIndex
CREATE INDEX "conversations_patient_id_idx" ON "conversations"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_doctor_id_patient_id_key" ON "conversations"("doctor_id", "patient_id");

-- CreateIndex
CREATE INDEX "message_attachments_message_id_idx" ON "message_attachments"("message_id");

-- AddForeignKey
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "specialties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_clinics" ADD CONSTRAINT "doctor_clinics_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_certificates" ADD CONSTRAINT "doctor_certificates_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deactivation_requests" ADD CONSTRAINT "deactivation_requests_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deactivation_requests" ADD CONSTRAINT "deactivation_requests_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_doctor_id_clinic_id_fkey" FOREIGN KEY ("doctor_id", "clinic_id") REFERENCES "doctor_clinics"("doctor_id", "clinic_id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_slot_id_doctor_id_clinic_id_fkey" FOREIGN KEY ("slot_id", "doctor_id", "clinic_id") REFERENCES "availability_slots"("id", "doctor_id", "clinic_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─────────────────────────────────────────────────────────────────────────────────────
-- Integrity rules Prisma cannot express in schema.prisma.
-- Keep them: they make the database itself refuse invalid or conflicting data, even if
-- application code has a bug or two requests race each other.
-- ─────────────────────────────────────────────────────────────────────────────────────

-- Needed for the "no overlapping slots" exclusion constraint (uuid + range comparison).
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- A profile can only be public while its verification is approved.
ALTER TABLE "doctors"
  ADD CONSTRAINT "doctors_published_requires_verified"
  CHECK ("publication_status" <> 'published' OR "verification_status" = 'verified');

ALTER TABLE "doctors"
  ADD CONSTRAINT "doctors_fee_non_negative" CHECK ("fee" >= 0),
  ADD CONSTRAINT "doctors_experience_range" CHECK ("experience_years" BETWEEN 0 AND 60);

ALTER TABLE "doctor_clinics"
  ADD CONSTRAINT "doctor_clinics_fee_non_negative" CHECK ("fee" IS NULL OR "fee" >= 0);

-- Slots: start before end, and no overlapping bookable slots for one doctor at one clinic.
-- Blocked ("unavailable") slots may overlap anything, so a doctor can block a time freely.
ALTER TABLE "availability_slots"
  ADD CONSTRAINT "slots_time_order" CHECK ("start_time" < "end_time");

ALTER TABLE "availability_slots"
  ADD CONSTRAINT "slots_no_overlap"
  EXCLUDE USING gist (
    "doctor_id"   WITH =,
    "clinic_id"   WITH =,
    tsrange("date" + "start_time", "date" + "end_time") WITH &&
  ) WHERE ("status" <> 'unavailable');

-- No double booking: at most one ACCEPTED request per slot. Pending requests may queue up.
CREATE UNIQUE INDEX "appointments_one_accepted_per_slot"
  ON "appointments" ("slot_id")
  WHERE "status" = 'accepted';

-- Conversations: a patient thread needs a patient; the admin thread must not have one,
-- and each doctor has exactly one admin thread.
ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_kind_matches_patient"
  CHECK (
    ("kind" = 'patient_doctor' AND "patient_id" IS NOT NULL) OR
    ("kind" = 'doctor_admin'   AND "patient_id" IS NULL)
  );

CREATE UNIQUE INDEX "conversations_one_admin_thread"
  ON "conversations" ("doctor_id")
  WHERE "kind" = 'doctor_admin';

-- Message and attachment limits mirrored from the UI (also enforce them in the API).
ALTER TABLE "messages"
  ADD CONSTRAINT "messages_body_length" CHECK (char_length("body") <= 2000);

ALTER TABLE "message_attachments"
  ADD CONSTRAINT "attachments_size_limit" CHECK ("file_size" BETWEEN 1 AND 10485760);

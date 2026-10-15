# Proposed PostgreSQL data model

A starting point derived from what the UI reads and writes (see [`API_CONTRACT.md`](API_CONTRACT.md)). It is a
**proposal**, not a mandate: adjust names and normalisation as the backend team sees fit, but keep the API
responses compatible with the contract.

Design notes:

- UUID primary keys, `timestamptz` timestamps, snake_case columns. The API maps to camelCase JSON.
- Business rules that must hold under concurrency are enforced **in the database** (unique/exclusion constraints),
  not only in application code.
- Passwords are stored as Argon2id/bcrypt hashes. Files live in object storage; the DB stores only keys.

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;     -- case-insensitive email
CREATE EXTENSION IF NOT EXISTS btree_gist; -- exclusion constraints on uuid + ranges

-- Enumerations (values are part of the API contract) -------------------------
CREATE TYPE user_role           AS ENUM ('patient', 'doctor', 'admin');
CREATE TYPE account_status      AS ENUM ('active', 'suspended', 'deactivated', 'deactivation_requested');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected', 'suspended');
CREATE TYPE publication_status  AS ENUM ('published', 'unpublished', 'inactive');
CREATE TYPE facility_type       AS ENUM ('clinic', 'hospital');
CREATE TYPE slot_status         AS ENUM ('available', 'booked', 'unavailable');
CREATE TYPE appointment_status  AS ENUM ('pending', 'accepted', 'rejected', 'cancelled', 'completed');

-- Identity ---------------------------------------------------------------------
CREATE TABLE users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          citext NOT NULL UNIQUE,
  password_hash  text   NOT NULL,
  role           user_role      NOT NULL,
  name           text   NOT NULL,
  phone          text,
  account_status account_status NOT NULL DEFAULT 'active',
  created_at     timestamptz    NOT NULL DEFAULT now(),
  updated_at     timestamptz    NOT NULL DEFAULT now()
);

-- Reference data -----------------------------------------------------------------
CREATE TABLE specialties (
  id          text PRIMARY KEY,                 -- slug, e.g. 'cardiology'
  name        text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  active      boolean NOT NULL DEFAULT true
);

CREATE TABLE facilities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  type          facility_type NOT NULL,
  address       text NOT NULL,
  area          text NOT NULL,
  city          text NOT NULL,
  phone         text NOT NULL,
  opening_hours text,
  image_url     text,
  latitude      numeric(9,6),                   -- enables "distanceKm" later
  longitude     numeric(9,6),
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Doctors --------------------------------------------------------------------------
CREATE TABLE doctors (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  specialty_id           text NOT NULL REFERENCES specialties(id),
  photo_url              text,
  qualifications         text[] NOT NULL DEFAULT '{}',
  languages              text[] NOT NULL DEFAULT '{}',
  experience_years       smallint NOT NULL CHECK (experience_years BETWEEN 0 AND 60),
  default_fee            integer  NOT NULL CHECK (default_fee >= 0),    -- BDT
  location               text NOT NULL,
  verification_status    verification_status NOT NULL DEFAULT 'pending',
  publication_status     publication_status  NOT NULL DEFAULT 'unpublished',
  profile_review_required boolean NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  -- A profile can only be public while verified.
  CONSTRAINT published_requires_verified
    CHECK (publication_status <> 'published' OR verification_status = 'verified')
);
CREATE INDEX doctors_public_idx ON doctors (specialty_id) WHERE publication_status = 'published';

CREATE TABLE doctor_facilities (
  doctor_id   uuid NOT NULL REFERENCES doctors(id)    ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES facilities(id) ON DELETE RESTRICT,
  fee         integer CHECK (fee >= 0),                  -- NULL = use doctors.default_fee
  PRIMARY KEY (doctor_id, facility_id)
);

CREATE TABLE doctor_certificates (                       -- admin verification evidence
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id   uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  storage_key text NOT NULL,
  file_name   text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE deactivation_requests (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id  uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  reason     text NOT NULL,
  status     text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'approved', 'declined')),
  decided_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);

-- Scheduling -----------------------------------------------------------------------
CREATE TABLE availability_slots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id   uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES facilities(id),
  slot_date   date NOT NULL,
  start_time  time NOT NULL,
  end_time    time NOT NULL,
  status      slot_status NOT NULL DEFAULT 'available',
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT slot_time_order CHECK (start_time < end_time),
  -- No overlapping, non-blocked slots for the same doctor and clinic (-> 409 SLOT_OVERLAP).
  CONSTRAINT slot_no_overlap EXCLUDE USING gist (
    doctor_id   WITH =,
    facility_id WITH =,
    tsrange(slot_date + start_time, slot_date + end_time) WITH &&
  ) WHERE (status <> 'unavailable')
);
-- The service layer must also check that (doctor_id, facility_id) exists in doctor_facilities
-- and that slot_date is not in the past.

CREATE TABLE appointment_requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id        uuid NOT NULL REFERENCES doctors(id),
  facility_id      uuid NOT NULL REFERENCES facilities(id),
  slot_id          uuid REFERENCES availability_slots(id),
  patient_user_id  uuid REFERENCES users(id),             -- NULL for guest bookings (open decision)
  patient_name     text NOT NULL,
  patient_phone    text NOT NULL,
  patient_email    citext NOT NULL,
  reason           text NOT NULL,
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  status           appointment_status NOT NULL DEFAULT 'pending',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
-- At most one ACCEPTED request per time (-> 409 APPOINTMENT_CONFLICT). Pending requests may coexist.
CREATE UNIQUE INDEX appointment_one_accepted_per_time
  ON appointment_requests (doctor_id, facility_id, appointment_date, appointment_time)
  WHERE status = 'accepted';
CREATE INDEX appointment_by_doctor_idx  ON appointment_requests (doctor_id, appointment_date);
CREATE INDEX appointment_by_patient_idx ON appointment_requests (patient_user_id);

-- Messaging ------------------------------------------------------------------------
CREATE TABLE conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            text NOT NULL CHECK (kind IN ('patient_doctor', 'doctor_admin')),
  doctor_id       uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_user_id uuid REFERENCES users(id),               -- NULL for doctor_admin
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, doctor_id, patient_user_id)
);
-- NULL patient ids never collide in the UNIQUE above, so guard the admin thread explicitly.
CREATE UNIQUE INDEX conversations_one_admin_thread ON conversations (doctor_id) WHERE kind = 'doctor_admin';

CREATE TABLE attachments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  uploader_id     uuid NOT NULL REFERENCES users(id),
  storage_key     text NOT NULL,
  file_name       text NOT NULL,
  mime_type       text NOT NULL,
  size_bytes      integer NOT NULL CHECK (size_bytes <= 10485760),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES users(id),
  body            text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  attachment_id   uuid REFERENCES attachments(id),
  sent_at         timestamptz NOT NULL DEFAULT now(),
  read_at         timestamptz
);
CREATE INDEX messages_by_conversation_idx ON messages (conversation_id, sent_at);

-- Support and governance -----------------------------------------------------------
CREATE TABLE support_requests (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      citext,
  message    text NOT NULL,
  status     text NOT NULL DEFAULT 'received',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (                                   -- append-only
  id             bigserial PRIMARY KEY,
  actor_user_id  uuid REFERENCES users(id),
  action         text NOT NULL,                            -- e.g. 'doctor.verification.set'
  entity_type    text NOT NULL,
  entity_id      uuid,
  before_state   jsonb,
  after_state    jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);
```

## Mapping notes

| API field | Source |
| --- | --- |
| `Doctor.name`, `Doctor.accountStatus` | `users.name`, `users.account_status` |
| `Doctor.specialty` | `specialties.name` (display label) |
| `Doctor.facilityIds` | `doctor_facilities.facility_id[]` |
| `Doctor.feesByFacility` | `doctor_facilities.fee` where not null |
| `Doctor.fee` | `doctors.default_fee` |
| `Doctor.nextAvailable`, `Doctor.availability` | derived from future `available` slots |
| `AppointmentRequest.doctor` / `.facility` | joins on `doctors`/`users` and `facilities` |
| `Conversation.canMessage` | exists an `accepted` appointment between the patient and doctor (or admin thread) |
| `Message.isMine` | `messages.sender_id = current user` |

Sessions: use a Postgres-backed store (e.g. `connect-pg-simple`) or Redis, with server-side invalidation on logout
and on account deactivation.

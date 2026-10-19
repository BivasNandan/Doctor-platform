/**
 * Shapes exchanged between the client and the API (JSDoc only, no runtime code).
 * The backend must return these fields. See docs/API_CONTRACT.md for endpoints.
 *
 * @typedef {'patient'|'doctor'|'admin'} Role
 * @typedef {'pending'|'accepted'|'rejected'|'cancelled'|'completed'} AppointmentStatus
 * @typedef {'pending'|'verified'|'rejected'|'suspended'} VerificationStatus
 * @typedef {'published'|'unpublished'|'inactive'} PublicationStatus
 * @typedef {'active'|'suspended'|'deactivated'|'deactivation_requested'} AccountStatus
 * @typedef {'available'|'booked'|'unavailable'} SlotStatus
 *
 * @typedef {Object} Specialty
 * @property {string} id
 * @property {string} name
 * @property {string} slug
 * @property {string} description
 * @property {boolean} [active]  Absent/true = active.
 *
 * @typedef {Object} Facility
 * @property {string} id
 * @property {string} name
 * @property {'clinic'|'hospital'} type
 * @property {string} address
 * @property {string} area
 * @property {string} city
 * @property {number} [distanceKm]  Optional, relative to the viewer.
 * @property {string} phone
 * @property {string} [image]
 * @property {boolean} [active]  Absent/true = active.
 *
 * @typedef {Object} Doctor
 * @property {string} id
 * @property {string} name
 * @property {string} specialtyId
 * @property {string} specialty              Display label.
 * @property {string} [image]
 * @property {string[]} qualifications
 * @property {number} experienceYears
 * @property {number} fee                    Default consultation fee (BDT).
 * @property {Record<string, number>} [feesByFacility]
 * @property {VerificationStatus} verificationStatus
 * @property {PublicationStatus} publicationStatus
 * @property {AccountStatus} [accountStatus]
 * @property {boolean} [profileReviewRequired]
 * @property {string} location
 * @property {string[]} facilityIds
 * @property {string} nextAvailable          Display label, e.g. "Today, 5:30 PM".
 * @property {string[]} availability         Buckets: "Today" | "Tomorrow" | "This week".
 *
 * @typedef {Object} AvailabilitySlot
 * @property {string} id
 * @property {string} doctorId
 * @property {string} facilityId
 * @property {string} date                   YYYY-MM-DD
 * @property {string} startTime              HH:mm (24h)
 * @property {string} endTime                HH:mm (24h)
 * @property {SlotStatus} status
 *
 * @typedef {Object} OpenSlot                Bookable time offered to patients.
 * @property {string} [id]                   Server slot id (preferred for booking).
 * @property {string} label                  Display time, e.g. "5:30 PM".
 * @property {'available'|'booked'|'passed'} status
 *
 * @typedef {Object} AppointmentRequest
 * @property {string} id
 * @property {string} doctorId
 * @property {string} facilityId
 * @property {string} date                   YYYY-MM-DD
 * @property {string} time                   Display time, e.g. "5:30 PM".
 * @property {string} patientName
 * @property {string} phone
 * @property {string} email
 * @property {string} reason
 * @property {AppointmentStatus} status
 * @property {{id: string, name: string, specialty: string, image?: string}} [doctor]
 *   Embedded summary (the server joins it, so unlisted doctors still resolve).
 * @property {{id: string, name: string, address: string, area: string, city: string}} [facility]
 *   Embedded clinic summary.
 *
 * @typedef {Object} Conversation
 * @property {string} id
 * @property {string} participantId
 * @property {Role} participantRole
 * @property {string} participantName
 * @property {string} [participantImage]
 * @property {string} updatedAt
 * @property {number} unread
 * @property {boolean} [online]
 * @property {boolean} canMessage            Server-computed eligibility.
 *
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} conversationId
 * @property {Role} sender
 * @property {boolean} isMine                Server-computed for the caller.
 * @property {string} body
 * @property {string} sentAt
 * @property {string} [readAt]
 * @property {string} [attachmentUrl]
 * @property {string} [attachmentName]
 *
 * @typedef {Object} AuthenticatedUser
 * @property {string} id
 * @property {Role} role
 * @property {string} [name]
 * @property {string} [email]
 * @property {string} [doctorId]             Present when role === 'doctor'.
 * @property {AccountStatus} [accountStatus]
 *
 * @typedef {Object} AdminSummary
 * @property {number} pendingDoctors
 * @property {number} verifiedDoctors
 * @property {number} appointmentsToday
 * @property {number} activeFacilities
 * @property {number} activeSpecialties
 * @property {{month: string, count: number}[]} monthlyAppointments  month = YYYY-MM, oldest first.
 *
 * @typedef {Object} ApiErrorBody
 * @property {string} code                   Machine-readable, e.g. "APPOINTMENT_CONFLICT".
 * @property {string} message                Safe to show to users.
 * @property {Record<string, string>} [details]  Field-level errors for 422 responses.
 */

export {};

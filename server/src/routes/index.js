import { accountsRouter } from "./accounts.js";
import { adminRouter } from "./admin.js";
import { adminPatientsRouter } from "./adminPatients.js";
import { adminReviewRouter } from "./adminReview.js";
import { adminReviewsRouter } from "./adminReviews.js";
import { authRouter } from "./auth.js";
import { bookingRouter } from "./booking.js";
import { catalogRouter } from "./catalog.js";
import { doctorRouter } from "./doctor.js";
import { eventsRouter } from "./events.js";
import { messagingRouter } from "./messaging.js";
import { notificationsRouter } from "./notifications.js";
import { onboardingRouter } from "./onboarding.js";
import { photosRouter } from "./photos.js";
import { reviewsRouter } from "./reviews.js";
import { supportRouter } from "./support.js";

/**
 * Every router of the API, mounted under /api/v1. To add a feature, create routes/<name>.js that
 * exports a router and add ONE line here: nothing else in the app needs to change.
 */
export function mountRoutes(api) {
  api.use("/auth", authRouter); // sign-in, sign-out, current user
  api.use("/auth", accountsRouter); // patient sign-up, email verification, password reset, profile
  api.use("/admin", adminReviewRouter); // administrator: certificates, deactivation and support requests (first: it answers GET /admin/doctors)
  api.use("/admin", adminRouter); // administrator tools
  api.use(onboardingRouter); // doctors: /auth/doctor/register, /doctor/certificates, /doctor/account/deactivation-requests
  api.use(messagingRouter); // /conversations, /attachments
  api.use(supportRouter); // /support-requests
  api.use(photosRouter); // /me/photo, /photos/users/:id (profile photos)
  api.use(reviewsRouter); // /doctors/:id/reviews, /reviews/:id
  api.use("/admin", adminPatientsRouter); // administrator: list and suspend patients
  api.use("/admin", adminReviewsRouter); // administrator: hide or restore reviews
  api.use(eventsRouter); // /events (instant updates)
  api.use(notificationsRouter); // /notifications (the bell menu, every role)
  api.use(catalogRouter); // public: /clinics, /specialties, /doctors
  api.use(bookingRouter); // patients: /doctors/:id/slots, /appointment-requests, /appointments
  api.use("/doctor", doctorRouter); // doctors: own profile, requests and availability
}

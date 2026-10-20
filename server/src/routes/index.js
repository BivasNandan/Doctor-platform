import { accountsRouter } from "./accounts.js";
import { adminRouter } from "./admin.js";
import { adminReviewRouter } from "./adminReview.js";
import { authRouter } from "./auth.js";
import { bookingRouter } from "./booking.js";
import { catalogRouter } from "./catalog.js";
import { doctorRouter } from "./doctor.js";
import { messagingRouter } from "./messaging.js";
import { notificationsRouter } from "./notifications.js";
import { onboardingRouter } from "./onboarding.js";
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
  api.use(notificationsRouter); // /notifications (the bell menu, every role)
  api.use(catalogRouter); // public: /clinics, /specialties, /doctors
  api.use(bookingRouter); // patients: /doctors/:id/slots, /appointment-requests, /appointments
  api.use("/doctor", doctorRouter); // doctors: own profile, requests and availability
}

import { ApiError, http } from "../http/httpClient.js";

export const authService = {
  /**
   * @param {{email: string, password: string, portal: 'doctor'|'admin'}} credentials
   *   `portal` only says which sign-in page was used. The server decides the
   *   role from the account and must reject a mismatch.
   * @returns {Promise<{user: import('../../types/contracts.js').AuthenticatedUser}>}
   */
  login: (credentials) => http.post("/auth/login", credentials),

  logout: () => http.post("/auth/logout"),

  /** Registers a doctor (pending verification) and signs them in. */
  registerDoctor: (input) => http.post("/auth/doctor/register", input),

  /** Creates a patient account and signs them in (email not yet verified). */
  registerPatient: (input) => http.post("/auth/patient/register", input),

  /** Confirms the emailed code. Resolves `{ user }` with `emailVerified: true`. */
  verifyEmail: (code) => http.post("/auth/verify-email", { code }),

  /** Emails a fresh verification code. */
  resendVerification: () => http.post("/auth/verify-email/resend"),

  /**
   * Emails a password-reset link. Always resolves the same way, whether or not the
   * email belongs to an account, so the form cannot be used to discover accounts.
   */
  requestPasswordReset: (email) => http.post("/auth/forgot-password", { email }),

  /** Sets a new password using the token from the emailed link. */
  resetPassword: ({ token, password }) => http.post("/auth/reset-password", { token, password }),

  /** Updates the signed-in patient's name and phone. Resolves `{ user }`. */
  updateProfile: (input) => http.patch("/auth/me", input),

  /** Restores the session after a page reload. Resolves null when signed out. */
  async getCurrentUser() {
    try {
      const result = await http.get("/auth/me");
      return result?.user ?? null;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },
};

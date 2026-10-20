import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BookingDialog from "../components/booking/BookingDialog.jsx";
import { doctorProfilePath, PATHS, ROLES } from "../constants.js";
import { useAuth } from "./AuthContext.jsx";
import { useToast } from "./ToastContext.jsx";

const BookingContext = createContext(null);

/**
 * Lets any screen start a booking: `const { openBooking } = useBooking()`.
 *
 * Booking needs a verified patient account. Guests are sent to sign in (or sign up)
 * and then returned to the doctor's profile, where the wizard opens automatically
 * (see `DoctorProfilePage`). The dialog is mounted once here so pages stay free of
 * booking state.
 */
export function BookingProvider({ children }) {
  const { user } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);

  const openBooking = useCallback(
    (selected) => {
      const comeBack = { from: { pathname: doctorProfilePath(selected.id) }, resumeBooking: true };
      if (!user) return navigate(PATHS.login, { state: comeBack });
      if (user.role !== ROLES.PATIENT)
        return notify("Booking is for patient accounts. Sign out and sign in as a patient to book.");
      if (!user.emailVerified) return navigate(PATHS.verifyEmail, { state: comeBack });
      return setDoctor(selected);
    },
    [user, navigate, notify],
  );
  const closeBooking = useCallback(() => setDoctor(null), []);
  const value = useMemo(() => ({ openBooking, closeBooking }), [openBooking, closeBooking]);

  return (
    <BookingContext.Provider value={value}>
      {children}
      {doctor && <BookingDialog key={doctor.id} doctor={doctor} onClose={closeBooking} />}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) throw new Error("useBooking must be used inside <BookingProvider>.");
  return context;
}

import { AuthProvider } from "../context/AuthContext.jsx";
import { CatalogProvider } from "../context/CatalogContext.jsx";
import { ConfirmProvider } from "../context/ConfirmContext.jsx";
import { ThemeProvider } from "../context/ThemeContext.jsx";
import { ToastProvider } from "../context/ToastContext.jsx";
import { BookingProvider } from "../features/booking/BookingContext.jsx";

/** Every app-wide provider, in dependency order. Must be rendered inside a Router. */
export default function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <CatalogProvider>
              <BookingProvider>{children}</BookingProvider>
            </CatalogProvider>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

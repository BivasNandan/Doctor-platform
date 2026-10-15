import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { isDemoMode } from "../../config/env.js";
import { PATHS } from "../../constants/paths.js";
import { ROLES } from "../../constants/roles.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { initials } from "../../utils/format.js";
import { describeAccount } from "./accountSummary.js";

/** Account chip in the topbar with a dropdown menu. */
export default function AccountMenu() {
  const { user, logout } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const account = describeAccount(user);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const goTo = (path) => {
    setOpen(false);
    navigate(path);
  };

  const signOut = async () => {
    setOpen(false);
    try {
      await logout();
    } catch (error) {
      notify(error.message);
    }
    navigate(PATHS.discover);
  };

  return (
    <div className="account-menu-wrap" ref={menuRef}>
      <button
        className="account-trigger glass-pill"
        type="button"
        aria-label="Open account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <UserRound size={18} />
        <ChevronDown size={13} />
      </button>
      {open && (
        <div className="account-menu surface" role="menu" aria-label="Account menu">
          <div className="account-summary">
            <span className="account-avatar" aria-hidden="true">
              {initials(account.name)}
            </span>
            <span>
              <strong>{account.name}</strong>
              <small>{account.type}</small>
            </span>
          </div>
          <div className="account-details">
            <span>
              {user
                ? "Signed in to Carewell"
                : isDemoMode
                  ? "Demo mode · identity is not verified"
                  : "Not signed in"}
            </span>
            {user?.accountStatus && <span>Account status: {user.accountStatus}</span>}
          </div>
          <div className="account-menu-divider" />
          <button
            role="menuitem"
            className="account-menu-item"
            type="button"
            onClick={() => goTo(account.home)}
          >
            <UserRound size={15} />
            <span>{account.homeLabel}</span>
          </button>
          {user?.role === ROLES.PATIENT && (
            <button
              role="menuitem"
              className="account-menu-item"
              type="button"
              onClick={() => goTo(PATHS.profile)}
            >
              <UserRound size={15} />
              <span>My profile</span>
            </button>
          )}
          <button
            role="menuitem"
            className="account-menu-item"
            type="button"
            onClick={() => goTo(PATHS.assistance)}
          >
            <ShieldCheck size={15} />
            <span>Help &amp; support</span>
          </button>
          {user ? (
            <button
              role="menuitem"
              className="account-menu-item account-menu-danger"
              type="button"
              onClick={signOut}
            >
              <LogOut size={15} />
              <span>Sign out</span>
            </button>
          ) : (
            <button
              role="menuitem"
              className="account-menu-item"
              type="button"
              onClick={() => goTo(PATHS.signup)}
            >
              <UserRound size={15} />
              <span>Create account</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

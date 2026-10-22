import { motion, useReducedMotion } from "framer-motion";
import { Suspense, useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useDocumentTitle } from "../../hooks/useDocumentTitle.js";
import { ErrorBoundary, PageLoader } from "../ui/index.js";
import Footer from "./Footer.jsx";
import MobileDrawer from "./MobileDrawer.jsx";
import MobileQuickNav from "./MobileQuickNav.jsx";
import { routeTitle } from "./navigation.js";
import { useLanguage } from "../../context/LanguageContext.jsx";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

/** Chrome shared by every screen: sidebar, topbar, footer and mobile navigation. */
export default function AppShell() {
  const { pathname } = useLocation();
  const { language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const main = useRef(null);

  useDocumentTitle(routeTitle(pathname));

  // Start every navigation at the top and close the mobile drawer.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          main.current?.focus();
        }}
      >
        Skip to content
      </a>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <Sidebar />
      <div className="main-column">
        <Topbar onOpenMenu={() => setDrawerOpen(true)} />
        <main className="page-content" id="main-content" lang={language} ref={main} tabIndex={-1}>
          <motion.div
            key={pathname}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}
          >
            <ErrorBoundary key={pathname}>
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </motion.div>
        </main>
        <Footer />
      </div>
      {drawerOpen && <MobileDrawer onClose={() => setDrawerOpen(false)} />}
      <MobileQuickNav />
    </div>
  );
}

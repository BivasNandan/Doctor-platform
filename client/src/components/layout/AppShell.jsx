import { Suspense, useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useDocumentTitle } from "../../hooks/useDocumentTitle.js";
import { ErrorBoundary, PageLoader } from "../ui";
import Footer from "./Footer.jsx";
import MobileDrawer from "./MobileDrawer.jsx";
import MobileQuickNav from "./MobileQuickNav.jsx";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import { routeTitle } from "./navigation.js";

/** Chrome shared by every screen: sidebar, topbar, footer and mobile navigation. */
export default function AppShell() {
  const { pathname } = useLocation();
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
        <main className="page-content" id="main-content" ref={main} tabIndex={-1}>
          <ErrorBoundary key={pathname}>
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
        <Footer />
      </div>
      {drawerOpen && <MobileDrawer onClose={() => setDrawerOpen(false)} />}
      <MobileQuickNav />
    </div>
  );
}

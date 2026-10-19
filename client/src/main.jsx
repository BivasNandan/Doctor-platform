import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App, { AppProviders } from "./App.jsx";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/pages.css";
import "./styles/responsive.css";

// HashRouter keeps deep links working on static hosts (GitHub Pages) without
// server rewrites. Switch to BrowserRouter once the app is served with SPA fallback.
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <HashRouter>
      <AppProviders>
        <App />
      </AppProviders>
    </HashRouter>
  </StrictMode>,
);

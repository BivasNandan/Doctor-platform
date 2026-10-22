import { Link } from "react-router-dom";
import { PATHS } from "../../constants.js";
import { useLanguage } from "../../context/LanguageContext.jsx";

export default function Footer() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <footer className="page-footer" lang={language}>
      <span>© {new Date().getFullYear()} Carewell Health</span>
      <span>{t("Thoughtful care, closer to you")}</span>
      <div className="footer-actions">
        <button
          className="language-toggle"
          type="button"
          lang={language === "bn" ? "en" : "bn"}
          onClick={() => setLanguage(language === "bn" ? "en" : "bn")}
        >
          {language === "bn" ? "English" : "বাংলা"}
        </button>
        <Link to={PATHS.assistance}>{t("Help & support")}</Link>
      </div>
    </footer>
  );
}

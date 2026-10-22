import { useLanguage } from "../../context/LanguageContext.jsx";

/** Page title block: eyebrow, h1, optional description and right-aligned action. */
export default function SectionHeading({ eyebrow, title, description, action }) {
  const { t } = useLanguage();
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{t(eyebrow)}</span>
        <h1>{typeof title === "string" ? t(title) : title}</h1>
        {description && <p>{typeof description === "string" ? t(description) : description}</p>}
      </div>
      {action}
    </div>
  );
}

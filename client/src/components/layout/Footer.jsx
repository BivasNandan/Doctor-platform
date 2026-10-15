import { Link } from "react-router-dom";
import { PATHS } from "../../constants/paths.js";

export default function Footer() {
  return (
    <footer className="page-footer">
      <span>© {new Date().getFullYear()} Carewell Health</span>
      <span>Thoughtful care, closer to you</span>
      <Link to={PATHS.assistance}>Help &amp; support</Link>
    </footer>
  );
}

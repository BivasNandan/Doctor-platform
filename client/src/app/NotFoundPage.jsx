import { Link } from "react-router-dom";
import { PATHS } from "../constants/paths.js";
import { EmptyState } from "../components/ui";

export default function NotFoundPage() {
  return (
    <EmptyState
      title="Page not found"
      description="The page you’re looking for doesn’t exist or has moved."
      action={
        <Link className="button button-primary" to={PATHS.discover}>
          Back to home
        </Link>
      }
    />
  );
}

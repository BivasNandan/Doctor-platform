import { Link } from "react-router-dom";
import { EmptyState } from "../components/ui/index.js";
import { PATHS } from "../constants.js";

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

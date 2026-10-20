import { TriangleAlert } from "lucide-react";
import Button from "./Button.jsx";
import EmptyState from "./EmptyState.jsx";

/** Shown when loading a screen's data failed. Offers a retry. */
export default function ErrorState({ error, onRetry, title = "We couldn’t load this" }) {
  return (
    <EmptyState
      icon={TriangleAlert}
      title={title}
      description={error?.message || "Something went wrong. Please try again."}
      action={
        onRetry && (
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        )
      }
    />
  );
}

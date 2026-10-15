import { Component } from "react";
import { TriangleAlert } from "lucide-react";
import Button from "./Button.jsx";
import EmptyState from "./EmptyState.jsx";

/** Catches render errors so a bug in one screen does not blank the whole app. */
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    // Hook for an error-reporting service (Sentry, etc.).
    console.error("Unhandled UI error", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Something went wrong"
        description="This screen hit an unexpected problem. Reload to try again."
        action={<Button onClick={() => window.location.reload()}>Reload</Button>}
      />
    );
  }
}

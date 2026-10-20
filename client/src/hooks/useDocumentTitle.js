import { useEffect } from "react";

const BASE_TITLE = "Carewell";

/** Sets the browser tab title for the current screen. */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE_TITLE}` : BASE_TITLE;
  }, [title]);
}

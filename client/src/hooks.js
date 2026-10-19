import { useCallback, useEffect, useRef, useState } from "react";

// ─── useResource ───────────────────────────────────────────────────────────────────────────

/**
 * Loads async data and tracks loading / error state.
 *
 * @template T
 * @param {() => Promise<T>} loader  Called on mount, whenever `deps` change and on `reload()`.
 * @param {unknown[]} [deps]         Values the loader depends on.
 * @param {{enabled?: boolean}} [options]
 * @returns {{data: T|undefined, error: Error|null, loading: boolean, reload: () => void, setData: Function}}
 */
export function useResource(loader, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: undefined, error: null, loading: enabled });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: null }));
    loader()
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      })
      .catch((error) => {
        if (!cancelled) setState((current) => ({ ...current, error, loading: false }));
      });
    return () => {
      cancelled = true;
    };
    // The caller owns the dependency list; `loader` is re-created every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version, enabled]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  const setData = useCallback(
    (updater) =>
      setState((current) => ({
        ...current,
        data: typeof updater === "function" ? updater(current.data) : updater,
      })),
    [],
  );

  return { ...state, reload, setData };
}

// ─── useDebouncedValue ─────────────────────────────────────────────────────────────────────

/** Returns `value` after it has stopped changing for `delay` ms. */
export function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ─── useDocumentTitle ──────────────────────────────────────────────────────────────────────

const BASE_TITLE = "Carewell";

/** Sets the browser tab title for the current screen. */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE_TITLE}` : BASE_TITLE;
  }, [title]);
}

// ─── useModalBehavior ──────────────────────────────────────────────────────────────────────

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Dialog behaviour shared by modals and drawers: Escape closes, focus moves
 * inside on open, Tab is trapped, and focus returns to the trigger on close.
 * @param {import('react').RefObject<HTMLElement>} ref  The dialog element.
 * @param {() => void} onClose
 */
export function useModalBehavior(ref, onClose) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previous = document.activeElement;
    const node = ref.current;
    node?.querySelector(FOCUSABLE)?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onCloseRef.current?.();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const items = [...node.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [ref]);
}

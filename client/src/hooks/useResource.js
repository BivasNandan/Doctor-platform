import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Loads async data and tracks loading / error state.
 *
 * @template T
 * @param {() => Promise<T>} loader  Called on mount, whenever `deps` change and on `reload()`.
 * @param {unknown[]} [deps]         Values the loader depends on.
 * @param {{enabled?: boolean, refreshMs?: number}} [options]
 *   `refreshMs` re-runs the loader quietly every that many milliseconds (no loading flash, paused while
 *   the tab is hidden, and refreshed as soon as the tab is visible again). Use it for live-ish data.
 * @returns {{data: T|undefined, error: Error|null, loading: boolean, reload: () => void, setData: Function}}
 */
export function useResource(loader, deps = [], { enabled = true, refreshMs = 0 } = {}) {
  const [state, setState] = useState({ data: undefined, error: null, loading: enabled });
  const [version, setVersion] = useState(0);
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    if (!enabled || !refreshMs) return undefined;
    let cancelled = false;
    const refresh = () => {
      if (document.hidden) return;
      loaderRef
        .current()
        .then((data) => {
          if (!cancelled) setState((current) => ({ ...current, data, error: null }));
        })
        .catch(() => undefined); // a failed background refresh keeps showing the last good data
    };
    const timer = setInterval(refresh, refreshMs);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
    // The caller owns the dependency list, exactly like the loading effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, refreshMs]);

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

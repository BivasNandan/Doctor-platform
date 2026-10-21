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
 * @returns {{data: T|undefined, error: Error|null, loading: boolean, reload: () => void,
 *   refresh: () => Promise<void>, setData: Function}}
 *   `refresh()` re-runs the loader quietly (no loading flash); `reload()` shows the loading state.
 */
export function useResource(loader, deps = [], { enabled = true, refreshMs = 0 } = {}) {
  const [state, setState] = useState({ data: undefined, error: null, loading: enabled });
  const [version, setVersion] = useState(0);
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });
  const latest = useRef(0); // ticket of the newest request: an older answer must never overwrite a newer one
  const edits = useRef(0); // how many times the page changed the data itself through setData

  /**
   * One quiet load. An answer that is already outdated is dropped, and if the page changed the data
   * (for example showed a pushed message) while the request was in flight, the data is fetched again
   * instead of overwriting that change with an older copy.
   */
  const quietLoad = useCallback(async () => {
    latest.current += 1;
    const ticket = latest.current;
    const editsAtStart = edits.current;
    let data;
    try {
      data = await loaderRef.current();
    } catch {
      return; // a failed background refresh keeps showing the last good data
    }
    if (ticket !== latest.current) return;
    if (edits.current !== editsAtStart) {
      await quietLoad();
      return;
    }
    setState((current) => ({ ...current, data, error: null }));
  }, []);

  useEffect(() => {
    if (!enabled || !refreshMs) return undefined;
    const refresh = () => {
      if (!document.hidden) quietLoad();
    };
    const timer = setInterval(refresh, refreshMs);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
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
    latest.current += 1; // anything still in flight belongs to the previous inputs
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
  const refresh = quietLoad;
  const setData = useCallback((updater) => {
    edits.current += 1;
    setState((current) => ({
      ...current,
      data: typeof updater === "function" ? updater(current.data) : updater,
    }));
  }, []);

  return { ...state, reload, refresh, setData };
}

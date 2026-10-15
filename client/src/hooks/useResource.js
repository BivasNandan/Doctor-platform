import { useCallback, useEffect, useState } from "react";

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

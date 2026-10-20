import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "../components/ui/index.js";

const ConfirmContext = createContext(null);

/**
 * Promise-based replacement for window.confirm().
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "Deactivate?", message: "..." }))) return;
 */
export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setRequest(options);
      }),
    [],
  );

  const settle = (answer) => {
    resolver.current?.(answer);
    resolver.current = null;
    setRequest(null);
  };

  const value = useMemo(() => confirm, [confirm]);
  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {request && (
        <ConfirmDialog {...request} onConfirm={() => settle(true)} onCancel={() => settle(false)} />
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm must be used inside <ConfirmProvider>.");
  return context;
}
